// ComparePage.js
//
// This page receives two player objects from LandingPage via React Router state.
// location.state.player1 and location.state.player2 are the full API response
// objects that were selected on the landing page.
//
// The page is structured in four sections:
//   1. Player header — two portrait cards with VS badge between them
//   2. Radar chart  — overall skill shape comparison (6 axes)
//   3. Stat bars    — horizontal comparison bars matching the idea from the wireframe
//   4. Bar + Pie    — the other two chart types required

import { useLocation, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
} from "chart.js";

import { Bar, Pie, Radar } from "react-chartjs-2";


// Register every Chart.js module we use.
// If you forget to register something, the chart silently fails to render.
ChartJS.register(
  BarElement, CategoryScale, LinearScale,
  Tooltip, Legend, ArcElement,
  RadialLinearScale, PointElement, LineElement
);

// Consistent colour system 

const C1 = {
  solid:  "#3b82f6",
  faded:  "rgba(59,130,246,0.15)",
  border: "rgba(59,130,246,0.9)",
};
const C2 = {
  solid:  "#e2e8f0",
  faded:  "rgba(226,232,240,0.1)",
  border: "rgba(226,232,240,0.7)",
};

// Shared Chart.js options ─
// These options make the charts match the dark theme.
// Without setting these, Chart.js defaults to black text on white — looks broken.
const darkTooltip = {
  backgroundColor: "#1e293b",
  borderColor:     "#334155",
  borderWidth:     1,
  titleColor:      "#f1f5f9",
  bodyColor:       "#94a3b8",
  padding:         10,
};

const darkLegend = {
  labels: {
    color:    "#94a3b8",
    font:     { size: 12 },
    boxWidth: 12,
    padding:  16,
  },
};

const barOptions = {
  responsive:           true,
  maintainAspectRatio:  true,
  plugins: {
    legend:  darkLegend,
    tooltip: darkTooltip,
  },
  scales: {
    x: {
      ticks: { color: "#94a3b8" },
      grid:  { color: "rgba(255,255,255,0.05)" },
    },
    y: {
      beginAtZero: true,
      ticks: { color: "#94a3b8" },
      grid:  { color: "rgba(255,255,255,0.05)" },
    },
  },
};

const radarOptions = {
  responsive:          true,
  maintainAspectRatio: true,
  plugins: {
    legend:  darkLegend,
    tooltip: darkTooltip,
  },
  scales: {
    r: {
      min: 0,
      max: 100,
      // Hide the number labels on each spoke — they're meaningless (0-100 normalised)
      ticks:       { display: false },
      pointLabels: { color: "#94a3b8", font: { size: 11 } },
      grid:        { color: "rgba(255,255,255,0.08)" },
      angleLines:  { color: "rgba(255,255,255,0.08)" },
    },
  },
};

const pieOptions = {
  responsive:          true,
  maintainAspectRatio: true,
  plugins: {
    legend:  darkLegend,
    tooltip: darkTooltip,
  },
};

// normalise() 
// Converts a raw stat value to a 0-100 scale relative to the higher of the two.
const normalise = (value, max) => (max === 0 ? 0 : (value / max) * 100);

// StatBar 
// This is the key visual element from the wireframe that was missing entirely. I don't need it but decided to try it out regardless.
// The bar is a single track. The blue portion fills left-to-right proportionally.
// If P1 has 32 goals and P2 has 19: blue fills 32/(32+19) = 62.7% of the bar.

function StatBar({ label, val1, val2, isPercent = false }) {
  const v1    = val1 ?? 0;
  const v2    = val2 ?? 0;
  const total = Math.max(v1 + v2, 1); // avoid division by zero
  const pct1  = (v1 / total) * 100;

  // The player with the higher value gets their number highlighted brighter
  const p1Wins = v1 > v2;
  const p2Wins = v2 > v1;

  const fmt = (v) => (isPercent ? `${v}%` : v);

  return (
    <div className="stat-bar-row">

      {/* Left: P1 value in blue */}
      <span className={`stat-bar-val stat-bar-val--p1 ${p1Wins ? "stat-bar-val--winner" : ""}`}>
        {fmt(v1)}
      </span>

      {/* Centre: stat label + the bar track */}
      <div className="stat-bar-centre">
        <span className="stat-bar-label">{label}</span>
        <div className="stat-bar-track">
          {/* Blue fill represents P1's proportion of the combined total */}
          <div
            className="stat-bar-fill"
            style={{ width: `${pct1}%` }}
          />
        </div>
      </div>

      {/* Right: P2 value in light/white */}
      <span className={`stat-bar-val stat-bar-val--p2 ${p2Wins ? "stat-bar-val--winner" : ""}`}>
        {fmt(v2)}
      </span>

    </div>
  );
}

// PlayerHeader 
// The portrait card shown at the top of the page for each player.
function PlayerHeader({ player, side }) {
  if (!player) return null;

  const info  = player.player;
  const stats = player.statistics?.[0];

  const pos      = stats?.games?.position ?? "—";
  const club     = stats?.team?.name      ?? "—";
  const clubLogo = stats?.team?.logo      ?? null;

  return (
    <div className="player-header-card">

      {/* Circle photo with accent ring colour matching the player's side */}
      <div className={`header-photo-ring header-photo-ring--${side}`}>
        <img
          src={info.photo}
          alt={info.name}
          className="header-photo"
        />
      </div>

      {/* Club logo badge overlaid bottom-right of the photo ring */}
      {clubLogo && (
        <img src={clubLogo} alt={club} className="header-club-badge" />
      )}

      {/* Name — blue for P1, white for P2, matching the wireframe */}
      <h2 className={`header-name header-name--${side}`}>{info.name}</h2>

      {/* "Club Position" subtitle — exactly as shown in the wireframe */}
      <p className="header-sub">{club} {pos}</p>

    </div>
  );
}

// MAIN PAGE 
function ComparePage() {
  const location = useLocation();
  const navigate  = useNavigate();

  const player1 = location.state?.player1;
  const player2 = location.state?.player2;

  // Guard: if someone navigates to /compare directly without selecting players,
  // we send them back to the home page instead of crashing.
  // This must come BEFORE any code that reads from player1/player2.
  if (!player1 || !player2) {
    return (
      <div className="compare-guard">
        <p>No players selected.</p>
        <button className="action-btn action-btn--primary" onClick={() => navigate("/")}>
          ← Back to Search
        </button>
      </div>
    );
  }

  //  Extract stats safely 
  // Optional chaining (?.) means if any level is undefined, we get undefined
  // rather than a crash. The || 0 at the end gives a safe fallback number.
  const s1 = player1.statistics?.[0];
  const s2 = player2.statistics?.[0];

  const goals1   = s1?.goals?.total       || 0;
  const goals2   = s2?.goals?.total       || 0;
  const assists1 = s1?.goals?.assists     || 0;
  const assists2 = s2?.goals?.assists     || 0;
  const shots1   = s1?.shots?.total       || 0;
  const shots2   = s2?.shots?.total       || 0;
  const shotsOn1 = s1?.shots?.on          || 0;
  const shotsOn2 = s2?.shots?.on          || 0;
  const passes1  = s1?.passes?.total      || 0;
  const passes2  = s2?.passes?.total      || 0;
  const tackles1 = s1?.tackles?.total     || 0;
  const tackles2 = s2?.tackles?.total     || 0;
  const dribbles1= s1?.dribbles?.success  || 0;
  const dribbles2= s2?.dribbles?.success  || 0;

  // Shot accuracy: shots on target / total shots, expressed as a percentage.
  // This is a derived stat — the API doesn't give it directly, we calculate it.
  // Math.round() keeps it as a clean integer
  const shotAcc1 = shots1 > 0 ? Math.round((shotsOn1 / shots1) * 100) : 0;
  const shotAcc2 = shots2 > 0 ? Math.round((shotsOn2 / shots2) * 100) : 0;

  const name1 = player1.player.name;
  const name2 = player2.player.name;

  //  Radar chart data 
  // 6 axes to match the wireframe: Goals, Assists, Shots, Passes, Tackles, Dribbles
  // All values normalised to 0-100 so the shape is meaningful regardless of scale
  const maxGoals    = Math.max(goals1,    goals2);
  const maxAssists  = Math.max(assists1,  assists2);
  const maxShots    = Math.max(shots1,    shots2);
  const maxPasses   = Math.max(passes1,   passes2);
  const maxTackles  = Math.max(tackles1,  tackles2);
  const maxDribbles = Math.max(dribbles1, dribbles2);

  const radarData = {
    labels: ["Goals", "Assists", "Shots", "Passes", "Tackles", "Dribbles"],
    datasets: [
      {
        label:                name1,
        data: [
          normalise(goals1,    maxGoals),
          normalise(assists1,  maxAssists),
          normalise(shots1,    maxShots),
          normalise(passes1,   maxPasses),
          normalise(tackles1,  maxTackles),
          normalise(dribbles1, maxDribbles),
        ],
        backgroundColor:      C1.faded,
        borderColor:          C1.border,
        pointBackgroundColor: C1.solid,
        borderWidth:          2,
      },
      {
        label:                name2,
        data: [
          normalise(goals2,    maxGoals),
          normalise(assists2,  maxAssists),
          normalise(shots2,    maxShots),
          normalise(passes2,   maxPasses),
          normalise(tackles2,  maxTackles),
          normalise(dribbles2, maxDribbles),
        ],
        backgroundColor:      C2.faded,
        borderColor:          C2.border,
        pointBackgroundColor: C2.solid,
        borderWidth:          2,
      },
    ],
  };

  //  Bar chart data 
  // Simple grouped bar — Goals, Assists, Shots side by side for both players.
  const barData = {
    labels: ["Goals", "Assists", "Shots", "Tackles"],
    datasets: [
      {
        label:           name1,
        data:            [goals1, assists1, shots1, tackles1],
        backgroundColor: C1.faded,
        borderColor:     C1.border,
        borderWidth:     2,
        borderRadius:    6,
      },
      {
        label:           name2,
        data:            [goals2, assists2, shots2, tackles2],
        backgroundColor: C2.faded,
        borderColor:     C2.border,
        borderWidth:     2,
        borderRadius:    6,
      },
    ],
  };

  //  Pie chart data 
  // Goal contributions = goals + assists combined.
  // This answers "who contributed more to their team's attack overall?"
  const pieData = {
    labels: [name1, name2],
    datasets: [
      {
        data:            [goals1 + assists1, goals2 + assists2],
        backgroundColor: [C1.faded,  C2.faded],
        borderColor:     [C1.solid,  C2.solid],
        borderWidth:     2,
        hoverOffset:     8,
      },
    ],
  };

  //  Render 
  return (
    <div className="compare-page">

      {/*  PAGE TITLE  */}
      <div className="compare-page-header">
        <button className="back-btn" onClick={() => navigate("/")}>← Back</button>
        <h1 className="compare-page-title">Elite Comparison</h1>
      </div>

      {/*  PLAYER HEADERS  */}
      <section className="compare-top">
        <PlayerHeader player={player1} side="p1" />
        <div className="vs-badge">VS</div>
        <PlayerHeader player={player2} side="p2" />
      </section>

      {/*  RADAR CHART  */}
      <section className="chart-section">
        <p className="chart-label">Overall Comparison</p>
        <div className="chart-inner chart-inner--radar">
          <Radar data={radarData} options={radarOptions} />
        </div>
      </section>

      {/*  STAT COMPARISON BARS  */}
      {/* This is the main feature from the wireframe bottom half.
          Each StatBar row: [P1 value] [label + bar] [P2 value]
          The bar visually shows who leads for that stat at a glance. */}
      <section className="stat-bars-section">
        <p className="section-label">HEAD TO HEAD</p>
        <StatBar label="GOALS SCORED"   val1={goals1}   val2={goals2}   />
        <StatBar label="ASSISTS"        val1={assists1} val2={assists2} />
        <StatBar label="SHOTS"          val1={shots1}   val2={shots2}   />
        <StatBar label="SHOT ACCURACY"  val1={shotAcc1} val2={shotAcc2} isPercent />
        <StatBar label="TACKLES"        val1={tackles1} val2={tackles2} />
        <StatBar label="DRIBBLES"       val1={dribbles1}val2={dribbles2}/>
      </section>

      {/*  BAR CHART  */}
      <section className="chart-section">
        <p className="chart-label">Goals · Assists · Shots · Tackles</p>
        <div className="chart-inner">
          <Bar data={barData} options={barOptions} />
        </div>
      </section>

      {/*  PIE CHART  */}
      <section className="chart-section">
        <p className="chart-label">Goal Contributions (Goals + Assists)</p>
        <div className="chart-inner chart-inner--pie">
          <Pie data={pieData} options={pieOptions} />
        </div>
      </section>

      {/*  ACTIONS  */}
      <div className="compare-actions">
        <button
          className="action-btn action-btn--secondary"
          onClick={() => navigate("/")}
        >
          ← New Comparison
        </button>
        <button
          className="action-btn action-btn--primary"
          onClick={() => navigate("/timeline", { state: { player1, player2 } })}
        >
          View Performance Timeline →
        </button>
      </div>


    </div>
  );
}

export default ComparePage;