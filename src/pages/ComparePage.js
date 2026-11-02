import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
  ArcElement, RadialLinearScale, PointElement, LineElement,
} from "chart.js";
import { Bar, Pie, Radar } from "react-chartjs-2";
import { formatStat, playerMetrics, relativePair, formatSeason, recordSeason, recordLabel, seasonSummary, playerClub } from "../playerData";
import { PLAYER_COLORS, CHART_LABEL, CHART_GRID, CHART_TOOLTIP } from "../chartTheme";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend,
  ArcElement, RadialLinearScale, PointElement, LineElement);

const [C1, C2] = PLAYER_COLORS;
const tooltip = CHART_TOOLTIP;
const legend = { labels: { color: CHART_LABEL, font: { size: 12 }, boxWidth: 12, padding: 16 } };
const baseOptions = { responsive: true, maintainAspectRatio: false };
const barOptions = {
  ...baseOptions,
  plugins: { legend, tooltip },
  scales: {
    x: { ticks: { color: CHART_LABEL }, grid: { color: CHART_GRID } },
    y: {
      beginAtZero: true,
      title: { display: true, text: "Season total (count)", color: CHART_LABEL },
      ticks: { color: CHART_LABEL, precision: 0 },
      grid: { color: CHART_GRID },
    },
  },
};
const radarOptions = {
  ...baseOptions,
  plugins: {
    legend,
    tooltip: {
      ...tooltip,
      callbacks: {
        label: (context) => `${context.dataset.label}: ${Number(context.raw).toFixed(1)} / 100 (pair-relative)`,
      },
    },
  },
  scales: {
    r: {
      min: 0, max: 100,
      ticks: { color: CHART_LABEL, stepSize: 25, backdropColor: "transparent" },
      pointLabels: { color: CHART_LABEL, font: { size: 11 } },
      grid: { color: CHART_GRID },
      angleLines: { color: CHART_GRID },
    },
  },
};
const pieOptions = { ...baseOptions, plugins: { legend, tooltip } };
const RADAR_METRICS = [
  ["goals", "Goals"], ["assists", "Assists"], ["shots", "Shots"],
  ["passes", "Passes"], ["tackles", "Tackles"], ["dribbles", "Successful dribbles"],
];

function StatBar({ label, val1, val2, isPercent = false }) {
  const comparable = val1 != null && val2 != null;
  const total = comparable ? val1 + val2 : 0;
  const width = total > 0 ? val1 / total * 100 : 0;
  return (
    <div className="stat-bar-row">
      <span className={`stat-bar-val stat-bar-val--p1 ${comparable && val1 > val2 ? "stat-bar-val--winner" : ""}`}>
        {formatStat(val1, isPercent)}
      </span>
      <div className="stat-bar-centre">
        <span className="stat-bar-label">{label}</span>
        <div className="stat-bar-track" aria-hidden="true">
          {comparable && <div className="stat-bar-fill" style={{ width: `${width}%` }} />}
        </div>
      </div>
      <span className={`stat-bar-val stat-bar-val--p2 ${comparable && val2 > val1 ? "stat-bar-val--winner" : ""}`}>
        {formatStat(val2, isPercent)}
      </span>
    </div>
  );
}

function PlayerHeader({ player, side }) {
  const info = player.player;
  const stats = player.statistics?.[0];
  return (
    <div className="player-header-card">
      <div className={`header-photo-ring header-photo-ring--${side}`}>
        <img src={info.photo} alt={info.name} className="header-photo" />
        {stats?.team?.logo && <img src={stats.team.logo} alt="" className="header-club-badge" />}
      </div>
      <h2 className={`header-name header-name--${side}`}>{info.name}</h2>
      <p className="header-sub">{playerClub(player)} {stats?.games?.position ?? ""}</p>
      <p className="header-sub">{formatSeason(recordSeason(player))}</p>
    </div>
  );
}

function ComparePage({ player1, player2 }) {
  const navigate = useNavigate();
  if (!player1 || !player2) {
    return (
      <div className="compare-guard">
        <p>Select two players to open a comparison.</p>
        <button className="action-btn action-btn--primary" onClick={() => navigate("/")}>Back to Search</button>
      </div>
    );
  }
  const metrics = [playerMetrics(player1), playerMetrics(player2)];
  const names = [recordLabel(player1), recordLabel(player2)];
  const seasons = seasonSummary([player1, player2]);
  const colors = [C1, C2];
  const pairs = RADAR_METRICS.map(([key]) => relativePair(metrics[0][key], metrics[1][key]));
  const radarData = {
    labels: RADAR_METRICS.map(([, label]) => label),
    datasets: metrics.map((_, index) => ({
      label: names[index], data: pairs.map((pair) => pair[index]),
      backgroundColor: colors[index].faded, borderColor: colors[index].border,
      pointBackgroundColor: colors[index].solid, borderWidth: 2, spanGaps: false,
    })),
  };
  const barKeys = ["goals", "assists", "shots", "tackles"];
  const barData = {
    labels: ["Goals", "Assists", "Shots", "Tackles"],
    datasets: metrics.map((stats, index) => ({
      label: names[index], data: barKeys.map((key) => stats[key]),
      backgroundColor: colors[index].faded, borderColor: colors[index].border,
      borderWidth: 2, borderRadius: 6,
    })),
  };
  const contributions = metrics.map((stats) => stats.contributions);
  const hasContributions = contributions.every((value) => value != null);
  const pieData = {
    labels: names,
    datasets: [{
      data: contributions, backgroundColor: [C1.faded, C2.faded],
      borderColor: [C1.solid, C2.solid], borderWidth: 2, hoverOffset: 8,
    }],
  };

  return (
    <div className="compare-page">
      <div className="compare-page-header">
        <button className="back-btn" onClick={() => navigate("/")}>Back to Search</button>
        <h1 className="compare-page-title">Player Comparison</h1>
      </div>
      <section className="compare-top">
        <PlayerHeader player={player1} side="p1" />
        <div className="vs-badge">VS</div>
        <PlayerHeader player={player2} side="p2" />
      </section>
      <section className="chart-section">
        <p className="chart-label">Pair-relative comparison · {seasons}</p>
        <p className="data-note">
          Each radar axis is relative to these two players: the higher season total is 100,
          and the other is a percentage of it. Both zero totals score 0. This is not a league
          ranking or a player rating. An axis is omitted if either total is unavailable.
        </p>
        <div className="chart-inner chart-inner--radar">
          <Radar data={radarData} options={radarOptions} role="img" aria-label="Pair-relative radar comparison" />
        </div>
      </section>
      <section className="stat-bars-section">
        <p className="section-label">Head to Head · {seasons} totals</p>
        <p className="data-note">
          N/A means unavailable, or no attempts for a rate; 0 means a recorded zero.
          The blue bar shows Player A's share of the two displayed values, not a rating.
          Bars are left empty when data is missing or both values are zero.
          Shot accuracy is shots on target divided by total shots.
          Totals are not adjusted per appearance or per 90 minutes; an ongoing season may have fewer matches.
        </p>
        {RADAR_METRICS.map(([key, label]) => (
          <StatBar key={key} label={label} val1={metrics[0][key]} val2={metrics[1][key]} />
        ))}
        <StatBar label="Shot accuracy" val1={metrics[0].shotAccuracy} val2={metrics[1].shotAccuracy} isPercent />
      </section>
      <section className="chart-section">
        <p className="chart-label">Season totals · Goals, assists, shots and tackles</p>
        <p className="data-note">Raw counts, not percentages or per-match averages. Missing values are omitted, not plotted as zero.</p>
        <div className="chart-inner">
          <Bar data={barData} options={barOptions} role="img" aria-label="Season totals bar chart" />
        </div>
      </section>
      <section className="chart-section">
        <p className="chart-label">Goal Contributions (Goals + Assists)</p>
        <p className="data-note">
          Share of these two players' combined goals and assists, not their teams' or the league's totals.
          {names.map((name, index) => ` ${name}: ${formatStat(contributions[index])}.`)}
        </p>
        {hasContributions && contributions[0] + contributions[1] > 0 ? (
          <div className="chart-inner chart-inner--pie">
            <Pie data={pieData} options={pieOptions} role="img" aria-label="Combined goal contributions pie chart" />
          </div>
        ) : (
          <p className="data-note" role="status">
            {hasContributions ? "Both players have zero recorded goal contributions." : "A share cannot be calculated because goals or assists are unavailable."}
          </p>
        )}
      </section>
      <div className="compare-actions">
        <button className="action-btn action-btn--secondary" onClick={() => navigate("/")}>Change Players</button>
        <button className="action-btn action-btn--primary" onClick={() => navigate("/timeline")}>View Season Overlays</button>
      </div>
    </div>
  );
}

export default ComparePage;
