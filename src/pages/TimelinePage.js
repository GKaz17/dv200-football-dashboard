import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsStars } from "react-icons/bs";
import { FaDownload, FaRedo, FaTimes } from "react-icons/fa";
import {
  Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement,
  Tooltip, Legend, Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { formatStat, playerMetrics, recordLabel, recordSeason, seasonSummary, simulatedTimeline } from "../playerData";
import { historyRequestEstimate, loadMatchHistory } from "../matchHistory";
import { PLAYER_COLORS, CHART_LABEL, CHART_GRID, CHART_TOOLTIP } from "../chartTheme";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

const COLORS = PLAYER_COLORS;
const STAT_OPTIONS = [
  { value: "goals", label: "Goals" }, { value: "assists", label: "Assists" },
  { value: "shots", label: "Shots" }, { value: "passes", label: "Passes" },
  { value: "tackles", label: "Tackles" },
];
const lineOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: CHART_TOOLTIP,
  },
  scales: {
    x: { ticks: { color: CHART_LABEL, font: { size: 11 }, maxRotation: 0, maxTicksLimit: 6 }, grid: { color: CHART_GRID } },
    y: {
      beginAtZero: true,
      title: { display: true, text: "Illustrative cumulative count", color: CHART_LABEL },
      ticks: { color: CHART_LABEL, precision: 0 },
      grid: { color: CHART_GRID },
    },
  },
};

function TimelinePage({ player1, player2, seasons = [] }) {
  const navigate = useNavigate();
  const [selectedStat, setSelectedStat] = useState("goals");
  const [visible, setVisible] = useState({ p1: true, p2: true });
  const [source, setSource] = useState("simulated");
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [steps, setSteps] = useState(0);
  const [windowStart, setWindowStart] = useState("1");
  const [windowEnd, setWindowEnd] = useState("6");
  const [approveBudget, setApproveBudget] = useState(false);
  const [loadBudget, setLoadBudget] = useState(0);
  const requestRef = useRef(null);
  const pairKey = [player1, player2].map((player) => player ? `${player.player.id}:${recordSeason(player)}` : "").join("|");
  useEffect(() => {
    setHistory(null); setHistoryError(""); setHistoryLoading(false); setApproveBudget(false);
    return () => requestRef.current?.abort();
  }, [pairKey, windowStart, windowEnd]);

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
  const names = players.map(recordLabel);
  const seasonLabel = seasonSummary(players);
  const totals = metrics.map((stats) => stats[selectedStat]);
  const statLabel = STAT_OPTIONS.find((option) => option.value === selectedStat).label;
  const firstWeek = Number(windowStart), lastWeek = Number(windowEnd);
  const validWindow = Number.isInteger(firstWeek) && Number.isInteger(lastWeek) && firstWeek >= 1 && lastWeek <= 38 && firstWeek <= lastWeek;
  const requestEstimate = historyLoading || history ? loadBudget : validWindow ? historyRequestEstimate(players, firstWeek, lastWeek) : 0;
  const lineData = {
    labels: source === "recorded" ? Array.from({ length: validWindow ? lastWeek - firstWeek + 1 : 0 }, (_, index) => `MW ${firstWeek + index}`) : ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"],
    datasets: players.flatMap((player, index) => visible[index === 0 ? "p1" : "p2"] ? [{
      label: names[index],
      data: source === "recorded" ? (history?.[index] ?? []).slice(firstWeek - 1, lastWeek).map((week) => week[selectedStat]) : simulatedTimeline(totals[index], `${player.player.id}:${recordSeason(player)}:${selectedStat}`),
      borderColor: COLORS[index].solid, backgroundColor: COLORS[index].faded,
      pointBackgroundColor: COLORS[index].solid, pointRadius: 4, pointHoverRadius: 6,
      borderWidth: 2.5, fill: source === "simulated" && index === 0, tension: 0, spanGaps: false,
      borderDash: index === 0 ? [] : [6, 4],
    }] : []),
  };
  const options = { ...lineOptions, scales: { ...lineOptions.scales, y: { ...lineOptions.scales.y,
    title: { ...lineOptions.scales.y.title, text: source === "recorded" ? `Recorded ${statLabel.toLowerCase()} per matchweek` : "Illustrative cumulative count" } } } };
  const noCoverage = players.some((player) => seasons.find((item) => item.year === recordSeason(player))?.coverage?.fixtures?.statistics_players === false);

  async function loadHistory() {
    if (!validWindow || (requestEstimate > 20 && !approveBudget)) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoadBudget(requestEstimate);
    setHistoryLoading(true); setHistoryError(""); setSteps(0);
    try {
      const loaded = new Map();
      const rows = [];
      for (const player of players) {
        const key = `${player.player.id}:${recordSeason(player)}`;
        if (!loaded.has(key)) loaded.set(key, await loadMatchHistory(player, controller.signal,
          () => { if (!controller.signal.aborted) setSteps((value) => value + 1); }, { firstWeek, lastWeek }));
        rows.push(loaded.get(key));
      }
      if (!controller.signal.aborted) setHistory(rows);
    } catch (error) {
      if (!controller.signal.aborted) setHistoryError(error instanceof TypeError ? "Match history could not connect. Please retry." : error.message);
    } finally { if (!controller.signal.aborted) setHistoryLoading(false); }
  }

  function insight() {
    if (totals.some((total) => total == null)) {
      return `A season-total comparison for ${statLabel.toLowerCase()} is unavailable because one or both records are missing this statistic.`;
    }
    if (totals[0] === totals[1]) {
      return `${names[0]} and ${names[1]} each have ${totals[0]} recorded ${statLabel.toLowerCase()} in their selected seasons.`;
    }
    const leading = totals[0] > totals[1] ? 0 : 1;
    return `${names[leading]} has the higher recorded season total: ${totals[leading]} ${statLabel.toLowerCase()}, ${Math.abs(totals[0] - totals[1])} more than ${names[1 - leading]}.`;
  }

  return (
    <div className="timeline-page">
      <div className="timeline-header">
        <div className="timeline-header-left">
          <p className="season-label">{seasonLabel} season overlay</p>
          <h1 className="timeline-title">{source === "recorded" ? "Recorded Season Overlay" : "Simulated Season Timeline"}</h1>
          <div className="timeline-badge-row">
            <span className="avg-badge">{source === "recorded" ? "Recorded" : "Simulated"}</span>
            <span className="avg-context">{source === "recorded" ? "Aligned by Premier League matchweek" : "Not recorded match history"}</span>
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
        <fieldset className="timeline-source">
          <legend>Data source</legend>
          <label><input type="radio" name="timeline-source" value="simulated" checked={source === "simulated"} onChange={() => { requestRef.current?.abort(); setHistoryLoading(false); setSource("simulated"); }} /> Simulated</label>
          <label><input type="radio" name="timeline-source" value="recorded" checked={source === "recorded"} onChange={() => setSource("recorded")} /> Recorded matchweeks</label>
        </fieldset>
        <p className="data-note">
          {source === "recorded" ? "Real per-matchweek counts, aligned by round rather than calendar date. Missing or unplayed weeks are gaps, not zero. A zero requires a recorded zero or a complete team player list showing no appearance. Coverage can be partial and totals are not adjusted per 90 minutes." : <>These points illustrate a possible progression toward the API season totals.
          Monthly values are generated, not fetched from matches, and do not measure form.
          The same player, season and metric always produce the same points. N/A means no total is available.</>}
        </p>
        {source === "recorded" && <div className="history-controls">
          <div className="matchweek-window">
            <label htmlFor="matchweek-start">From matchweek<input id="matchweek-start" type="number" min="1" max="38" value={windowStart} disabled={historyLoading} onChange={(event) => setWindowStart(event.target.value)} /></label>
            <label htmlFor="matchweek-end">To matchweek<input id="matchweek-end" type="number" min="1" max="38" value={windowEnd} disabled={historyLoading} onChange={(event) => setWindowEnd(event.target.value)} /></label>
          </div>
          {!validWindow && <p className="data-note" role="alert">Choose a matchweek window from 1 to 38, with the start no later than the end.</p>}
          <p className="data-note">Up to {requestEstimate} API requests before caching, including a single-fixture fallback if batching is not included in your plan. Match data is reused for all five metrics.</p>
          {requestEstimate > 20 && <label className="budget-approval"><input type="checkbox" checked={approveBudget} disabled={historyLoading} onChange={(event) => setApproveBudget(event.target.checked)} /> Allow up to {requestEstimate} requests; this may exhaust the daily API allowance.</label>}
          {noCoverage ? <p className="data-note" role="status">Match-player statistics are not covered for one of these seasons.</p> :
            <button type="button" className="search-retry" disabled={historyLoading || Boolean(history) || !validWindow || (requestEstimate > 20 && !approveBudget)} onClick={loadHistory}>
              {historyError ? <FaRedo aria-hidden="true" /> : <FaDownload aria-hidden="true" />}
              {historyLoading ? `Loading match data... ${steps} steps` : historyError ? "Retry match history" : history ? "Match history loaded" : "Load match history"}
            </button>}
          {historyLoading && <button className="search-retry" type="button" onClick={() => {
            requestRef.current?.abort(); setHistoryLoading(false); setHistoryError("Match-history loading was cancelled.");
          }}><FaTimes aria-hidden="true" /> Cancel loading</button>}
          {historyError && <p className="data-note" role="alert">{historyError}</p>}
        </div>}
        <div className="player-pills">
          {players.map((player, index) => {
            const key = index === 0 ? "p1" : "p2";
            return (
              <button key={key} type="button" aria-pressed={visible[key]}
                className={`player-pill ${visible[key] ? `player-pill--active-${key}` : "player-pill--inactive"}`}
                onClick={() => setVisible((previous) => ({ ...previous, [key]: !previous[key] }))}>
                <span className={`pill-dot pill-dot--${key}`} />
                {names[index]} · {formatStat(totals[index])} total
              </button>
            );
          })}
        </div>
        {(source === "simulated" || history) && <div className="chart-inner">
          <Line data={lineData} options={options} role="img" aria-label={`${source === "recorded" ? "Recorded" : "Simulated"} ${statLabel.toLowerCase()} timeline`} />
        </div>}
        {source === "recorded" && history && players.map((player, index) =>
          history[index].slice(firstWeek - 1, lastWeek).every((week) => week[selectedStat] == null)
            ? <p className="data-note" role="status" key={index}>No recorded {statLabel.toLowerCase()} values are available in this matchweek window for {names[index]}. These gaps are not zero.</p>
            : null)}
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
        <p className="insight-heading">Recorded Season Totals · {seasonLabel}</p>
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
