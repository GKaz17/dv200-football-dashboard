// TimelinePage.js
//
// This page shows a simulated season performance timeline for both players.
// It receives player1 and player2 from React Router location.state —
// the same objects passed from LandingPage through ComparePage.
//
// Sections:
//   1. Page header  — title, season label, metric dropdown (top right)
//   2. Chart card   — player toggle pills + line chart
//   3. Comparative stats — two derived stat cards side by side
//   4. Insight card — dynamic sentence based on who leads the selected stat
//   5. Action buttons + Footer

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BsStars } from "react-icons/bs";
import Footer from "../components/Footer";

import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,   // Required for the area fill under the line — must be registered
} from "chart.js";

import { Line } from "react-chartjs-2";


ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

//  Colour system 
// Same two-player colour system as ComparePage so users learn it once.
const C1 = { solid: "#3b82f6", faded: "rgba(59,130,246,0.12)"  };
const C2 = { solid: "#f59e0b", faded: "rgba(245,158,11,0.08)"  };

//  generateTimeline() 
// The checkpoints aren't perfectly linear — they follow a realistic curve
// where players tend to start slower and peak mid-season.
// Small random variance (±4%) makes P1 and P2 lines look distinct rather than identical ramps that would be confusing to read.

function generateTimeline(total) {

  // 10 checkpoints across Aug–May, to get a more realistic accumulation curve
  const curve = [0.05, 0.12, 0.22, 0.35, 0.46, 0.57, 0.68, 0.80, 0.92, 1.0];
  return curve.map((fraction) => {
    const noise = (Math.random() - 0.5) * 0.08;
    return Math.max(0, Math.round(total * (fraction + noise)));
  });
}  

//  Stat options 
// Each option has a value (matches the API field key) and a display label.
// The metric dropdown top-right cycles through these.
const STAT_OPTIONS = [
  { value: "goals",   label: "Goals"   },
  { value: "assists", label: "Assists" },
  { value: "shots",   label: "Shots"   },
  { value: "passes",  label: "Passes"  },
  { value: "tackles", label: "Tackles" },
];

//  Chart.js options 
const lineOptions = {
  responsive:          true,
  maintainAspectRatio: false,
  plugins: {
    // Hide the default legend — we have our own custom player pills above the chart
    legend: { display: false },
    tooltip: {
      backgroundColor: "#1e293b",
      borderColor:     "#334155",
      borderWidth:     1,
      titleColor:      "#f1f5f9",
      bodyColor:       "#94a3b8",
      padding:         10,
    },
  },
  scales: {
    x: {
      ticks: { color: "#64748b", font: { size: 11 } },
      grid:  { color: "rgba(255,255,255,0.04)" },
    },
    y: {
      beginAtZero: true,
      // Hide y-axis tick labels 
      ticks:  { display: false },
      grid:   { color: "rgba(255,255,255,0.04)" },
      border: { display: false },
    },
  },
};

//  MAIN PAGE 
function TimelinePage() {
  const location = useLocation();
  const navigate  = useNavigate();

  const player1 = location.state?.player1;
  const player2 = location.state?.player2;

  //  GUARD — must be before any data access 
  // If someone navigates directly to the timeline without player state, we catch it here before anything tries to read from null. So the inital page will be empty like the Comparison Page.
  if (!player1 || !player2) {
    return (
      <div className="timeline-guard">
        <p>No players selected.</p>
        <button className="action-btn action-btn--primary" onClick={() => navigate("/")}>
          ← Back to Search
        </button>
      </div>
    );
  }

  //  State 
  const [selectedStat, setSelectedStat] = useState("goals");

  // Player visibility: controls whether each line shows on the chart.
  // This is an object so we can toggle by player key without an index.
  const [visible, setVisible] = useState({ p1: true, p2: true });

  function togglePlayer(key) {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  //  Extract stats 
  const s1 = player1.statistics?.[0];
  const s2 = player2.statistics?.[0];

  const name1 = player1.player.name;
  const name2 = player2.player.name;

  // Season totals for the selected stat — feeds into generateTimeline()
  const totals1 = {
    goals:   s1?.goals?.total    || 0,
    assists: s1?.goals?.assists  || 0,
    shots:   s1?.shots?.total    || 0,
    passes:  s1?.passes?.total   || 0,
    tackles: s1?.tackles?.total  || 0,
  };

  const totals2 = {
    goals:   s2?.goals?.total    || 0,
    assists: s2?.goals?.assists  || 0,
    shots:   s2?.shots?.total    || 0,
    passes:  s2?.passes?.total   || 0,
    tackles: s2?.tackles?.total  || 0,
  };

  const total1 = totals1[selectedStat];
  const total2 = totals2[selectedStat];

  // Current stat label for display (e.g. "Goals")
  const statLabel = STAT_OPTIONS.find((o) => o.value === selectedStat)?.label ?? "";

  //  Comparative stats (derived from API) 
  // Pass accuracy: the API provides passes.accuracy as a percentage directly.
  // Dribble success rate: dribbles.success / dribbles.attempts * 100
  const passAcc1 = s1?.passes?.accuracy  || 0;
  const passAcc2 = s2?.passes?.accuracy  || 0;

  const dribAtt1 = s1?.dribbles?.attempts || 0;
  const dribSuc1 = s1?.dribbles?.success  || 0;
  const dribAtt2 = s2?.dribbles?.attempts || 0;
  const dribSuc2 = s2?.dribbles?.success  || 0;


  const dribRate1 = dribAtt1 > 0 ? Math.round((dribSuc1 / dribAtt1) * 100) : 0;
  const dribRate2 = dribAtt2 > 0 ? Math.round((dribSuc2 / dribAtt2) * 100) : 0;

  // Generates a relevant sentence based on who leads the selected stat.
  // This makes the insight card feel connected to what the user is looking at.
  function getInsight() {
    if (total1 === total2) {
      return `${name1} and ${name2} are perfectly matched on ${statLabel.toLowerCase()} this season.`;
    }
    const leader  = total1 > total2 ? name1 : name2;
    const trailer = total1 > total2 ? name2 : name1;
    const leading = Math.max(total1, total2);
    const diff    = Math.abs(total1 - total2);
    return `${leader} leads on ${statLabel.toLowerCase()} this season with ${leading}, outperforming ${trailer} by ${diff}.`;
  }

  //  Build chart datasets 
  const datasets = [];

  if (visible.p1) {
    datasets.push({
      label:                name1,
      data:                 generateTimeline(total1),
      borderColor:          C1.solid,
      backgroundColor:      C1.faded,
      pointBackgroundColor: C1.solid,
      pointRadius:          4,
      pointHoverRadius:     6,
      borderWidth:          2.5,
      fill:                 true,   // area fill under the line (needs Filler plugin)
      tension:              0.4,    // smooth S-curve 
      // Solid line for P1
      borderDash:           [],
    });
  }

  if (visible.p2) {
    datasets.push({
      label:                name2,
      data:                 generateTimeline(total2),
      borderColor:          C2.solid,
      backgroundColor:      C2.faded,
      pointBackgroundColor: C2.solid,
      pointRadius:          4,
      pointHoverRadius:     6,
      borderWidth:          2.5,
      fill:                 false,
      tension:              0.4,
      // Dashed line for P2 — matches the wireframe visual style
      borderDash:           [6, 4],
    });
  }

  const lineData = {
   
    labels: ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"],
    datasets,
  };

  //  Render 
  return (
    <div className="timeline-page">

      {/*  PAGE HEADER */}
      <div className="timeline-header">

        <div className="timeline-header-left">
   
          <p className="season-label">2025 SEASON ANALYTICS</p>

      
          <h1 className="timeline-title">Performance Delta</h1>

     
          <div className="timeline-badge-row">
            <span className="avg-badge">+ Avg</span>
            <span className="avg-context">vs. Previous Season</span>
          </div>
        </div>

        {/* Metric selector*/}
        <div className="metric-selector">
          <label className="metric-label">Metric:</label>
          <select
            className="metric-select"
            value={selectedStat}
            onChange={(e) => setSelectedStat(e.target.value)}
          >
            {STAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/*  CHART CARD */}
      <div className="chart-card">

        {/* Player toggle pills */}
        <div className="player-pills">


          <button
            className={`player-pill ${visible.p1 ? "player-pill--active-p1" : "player-pill--inactive"}`}
            onClick={() => togglePlayer("p1")}
          >
            {/* Coloured dot indicator matching the line colour */}
            <span className="pill-dot pill-dot--p1" />
            {name1.split(" ").pop()} 
          </button>

     
          <button
            className={`player-pill ${visible.p2 ? "player-pill--active-p2" : "player-pill--inactive"}`}
            onClick={() => togglePlayer("p2")}
          >
            <span className="pill-dot pill-dot--p2" />
            {name2.split(" ").pop()}
          </button>

        </div>

        {/* Line chart — fixed height container so Chart.js renders correctly */}
        <div className="chart-inner">
          <Line data={lineData} options={lineOptions} />
        </div>

      </div>

      {/*  COMPARATIVE STATS 
          Two side-by-side cards showing real derived stats from the API.
          These update based on whichever players are loaded. */}
      <div className="comp-stats-section">
        <p className="comp-stats-label">COMPARATIVE STATS</p>

        <div className="comp-stats-grid">

          {/* Pass accuracy card — API provides this directly */}
          <div className="comp-stat-card">
            <p className="comp-stat-title">Pass Accuracy</p>
            <div className="comp-stat-values">
              <div className="comp-stat-player">
                <span className="comp-stat-name">{name1.split(" ").pop()}</span>
                <span className="comp-stat-num comp-stat-num--p1">{passAcc1}%</span>
              </div>
              <div className="comp-stat-player">
                <span className="comp-stat-name">{name2.split(" ").pop()}</span>
                <span className="comp-stat-num comp-stat-num--p2">{passAcc2}%</span>
              </div>
            </div>
            
            <div className="comp-stat-bar-track">
              <div className="comp-stat-bar-fill" style={{ width: `${passAcc1}%` }} />
            </div>
          </div>

          {/* Dribble success rate card — derived from dribbles.success / dribbles.attempts */}
          <div className="comp-stat-card">
            <p className="comp-stat-title">Dribble Success Rate</p>
            <div className="comp-stat-values">
              <div className="comp-stat-player">
                <span className="comp-stat-name">{name1.split(" ").pop()}</span>
                <span className="comp-stat-num comp-stat-num--p1">{dribRate1}%</span>
              </div>
              <div className="comp-stat-player">
                <span className="comp-stat-name">{name2.split(" ").pop()}</span>
                <span className="comp-stat-num comp-stat-num--p2">{dribRate2}%</span>
              </div>
            </div>
            <div className="comp-stat-bar-track">
              <div className="comp-stat-bar-fill" style={{ width: `${dribRate1}%` }} />
            </div>
          </div>

        </div>
      </div>

      {/*  INSIGHT CARD 
          Dynamic sentence generated from the current stat and player totals.
          Changes automatically when you switch the metric dropdown. */}
      <div className="insight-card">
        <div className="insight-icon-wrap">
          <BsStars className="insight-icon" />
        </div>
        <div className="insight-text">
          <p className="insight-heading">Insight: Season Leader</p>
          <p className="insight-body">{getInsight()}</p>
        </div>
      </div>

      {/*  ACTIONS  */}
      <div className="timeline-actions">
        <button
          className="action-btn action-btn--secondary"
          onClick={() => navigate(-1)}
        >
          ← Back to Comparison
        </button>
        <button
          className="action-btn action-btn--primary"
          onClick={() => navigate("/")}
        >
          New Comparison
        </button>
      </div>

     
    </div>
  );
}

export default TimelinePage;