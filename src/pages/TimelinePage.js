import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsStars } from "react-icons/bs";
import {
  Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement,
  Tooltip, Legend, Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { formatStat, playerMetrics, SEASON_LABEL, simulatedTimeline } from "../playerData";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

const COLORS = [
  { solid: "#3b82f6", faded: "rgba(59,130,246,0.12)" },
  { solid: "#f59e0b", faded: "rgba(245,158,11,0.08)" },
];
const STAT_OPTIONS = [
  { value: "goals", label: "Goals" }, { value: "assists", label: "Assists" },
  { value: "shots", label: "Shots" }, { value: "passes", label: "Passes" },
  { value: "tackles", label: "Tackles" },
];
const lineOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#1e293b", borderColor: "#334155", borderWidth: 1,
      titleColor: "#f1f5f9", bodyColor: "#94a3b8", padding: 10,
    },
  },
  scales: {
    x: { ticks: { color: "#94a3b8", font: { size: 11 } }, grid: { color: "rgba(255,255,255,0.04)" } },
    y: {
      beginAtZero: true,
      title: { display: true, text: "Illustrative cumulative count", color: "#94a3b8" },
      ticks: { color: "#94a3b8", precision: 0 },
      grid: { color: "rgba(255,255,255,0.04)" },
    },
  },
};

function TimelinePage({ player1, player2 }) {
  const navigate = useNavigate();
  const [selectedStat, setSelectedStat] = useState("goals");
  const [visible, setVisible] = useState({ p1: true, p2: true });

  if (!player1 || !player2) {
    return (
      <div className="timeline-guard">
        <p>Select two players to open a simulated timeline.</p>
        <button className="action-btn action-btn--primary" onClick={() => navigate("/")}>Back to Search</button>
      </div>
    );
  }

  const players = [player1, player2];
  const metrics = players.map(playerMetrics);
  const names = players.map((player) => player.player.name);
  const totals = metrics.map((stats) => stats[selectedStat]);
  const statLabel = STAT_OPTIONS.find((option) => option.value === selectedStat).label;
  const lineData = {
    labels: ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"],
    datasets: players.flatMap((player, index) => visible[index === 0 ? "p1" : "p2"] ? [{
      label: names[index],
      data: simulatedTimeline(totals[index], `${player.player.id}:${selectedStat}`),
      borderColor: COLORS[index].solid, backgroundColor: COLORS[index].faded,
      pointBackgroundColor: COLORS[index].solid, pointRadius: 4, pointHoverRadius: 6,
      borderWidth: 2.5, fill: index === 0, tension: 0,
      borderDash: index === 0 ? [] : [6, 4],
    }] : []),
  };

  function insight() {
    if (totals.some((total) => total == null)) {
      return `A season-total comparison for ${statLabel.toLowerCase()} is unavailable because one or both records are missing this statistic.`;
    }
    if (totals[0] === totals[1]) {
      return `${names[0]} and ${names[1]} each have ${totals[0]} recorded ${statLabel.toLowerCase()} in ${SEASON_LABEL}.`;
    }
    const leading = totals[0] > totals[1] ? 0 : 1;
    return `${names[leading]} has the higher recorded season total: ${totals[leading]} ${statLabel.toLowerCase()}, ${Math.abs(totals[0] - totals[1])} more than ${names[1 - leading]}.`;
  }

  return (
    <div className="timeline-page">
      <div className="timeline-header">
        <div className="timeline-header-left">
          <p className="season-label">{SEASON_LABEL} season totals</p>
          <h1 className="timeline-title">Simulated Season Timeline</h1>
          <div className="timeline-badge-row">
            <span className="avg-badge">Simulated</span>
            <span className="avg-context">Not recorded match history</span>
          </div>
        </div>
        <div className="metric-selector">
          <label className="metric-label" htmlFor="timeline-metric">Metric:</label>
          <select id="timeline-metric" className="metric-select" value={selectedStat}
            onChange={(event) => setSelectedStat(event.target.value)}>
            {STAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>
      <div className="chart-card">
        <p className="data-note">
          These points illustrate a possible progression toward the API season totals.
          Monthly values are generated, not fetched from matches, and do not measure form.
          The same player and metric always produce the same points. N/A means no total is available.
        </p>
        <div className="player-pills">
          {players.map((player, index) => {
            const key = index === 0 ? "p1" : "p2";
            return (
              <button key={key} type="button" aria-pressed={visible[key]}
                className={`player-pill ${visible[key] ? `player-pill--active-${key}` : "player-pill--inactive"}`}
                onClick={() => setVisible((previous) => ({ ...previous, [key]: !previous[key] }))}>
                <span className={`pill-dot pill-dot--${key}`} />
                {names[index]} · {formatStat(totals[index])}
              </button>
            );
          })}
        </div>
        <div className="chart-inner">
          <Line data={lineData} options={lineOptions} role="img" aria-label={`Simulated ${statLabel.toLowerCase()} timeline`} />
        </div>
        {totals.some((total) => total == null) && <p className="data-note">A player with N/A has no plotted line for this metric.</p>}
        {!visible.p1 && !visible.p2 && <p className="data-note" role="status">Both player lines are hidden.</p>}
      </div>
      <div className="comp-stats-section">
        <p className="comp-stats-label">Recorded season rates</p>
        <p className="data-note">Shot accuracy = shots on target / total shots. Dribble success = successful / attempted dribbles. N/A means missing data or no attempts.</p>
        <div className="comp-stats-grid">
          {[["shotAccuracy", "Shot Accuracy"], ["dribbleRate", "Dribble Success Rate"]].map(([key, title]) => (
            <div className="comp-stat-card" key={key}>
              <p className="comp-stat-title">{title}</p>
              <div className="comp-stat-values">
                {players.map((player, index) => (
                  <div className="comp-stat-player" key={index}>
                    <span className="comp-stat-name">{names[index]}</span>
                    <span className={`comp-stat-num comp-stat-num--p${index + 1}`}>{formatStat(metrics[index][key], true)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="insight-card">
        <div className="insight-icon-wrap"><BsStars className="insight-icon" /></div>
        <div className="insight-text">
          <p className="insight-heading">Recorded Season Totals</p>
          <p className="insight-body">{insight()}</p>
        </div>
      </div>
      <div className="timeline-actions">
        <button className="action-btn action-btn--secondary" onClick={() => navigate("/compare")}>Back to Comparison</button>
        <button className="action-btn action-btn--primary" onClick={() => navigate("/")}>Change Players</button>
      </div>
    </div>
  );
}

export default TimelinePage;
