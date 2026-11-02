// LandingPage.js
import { useState, useRef, useEffect, useId } from "react";
import { useNavigate } from "react-router-dom";
import { TbChartArrows } from "react-icons/tb";
import { MdOutlineTimer, MdBarChart } from "react-icons/md";
import { FaStar, FaSearch, FaRedo, FaTrash } from "react-icons/fa";
import { GiSoccerBall } from "react-icons/gi";
import { formatSeason, playerClub } from "../playerData";
import { searchPlayers } from "../playerSearch";

// PLAYER PANEL

// Suggestions:
//   Each suggestion row shows: [photo] [name] [team — right aligned]
//   This is the key UX fix for same-name players — you can see at a glance
//   which "Jones" or "Silva" you're picking.
// 
function PlayerPanel({ label, placeholder, player, onSelect, query, onQueryChange, navigationBusy,
  season, seasons, onSeasonChange, onAccessDenied, onSearchStart }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [status, setStatus]           = useState("");
  const [error, setError]             = useState("");
  const [noResults, setNoResults]     = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef  = useRef(null);
  const controllerRef = useRef(null);
  const requestRef = useRef(0);
  const lastSearchRef = useRef(null);
  const inputId = useId();
  const previousSeason = useRef(season);

  useEffect(() => {
    if (previousSeason.current === season) return;
    previousSeason.current = season;
    clearTimeout(debounceRef.current);
    controllerRef.current?.abort();
    requestRef.current += 1;
    setSuggestions([]); setLoading(false); setStatus(""); setError(""); setNoResults(false);
  }, [season]);

  useEffect(() => {
    if (!navigationBusy) return;
    clearTimeout(debounceRef.current);
    controllerRef.current?.abort();
    requestRef.current += 1;
    setLoading(false); setSuggestions([]); setStatus(""); setError(""); setNoResults(false);
  }, [navigationBusy]);

  function cancelPendingSearch() {
    clearTimeout(debounceRef.current);
    controllerRef.current?.abort();
    requestRef.current += 1;
  }

  useEffect(() => () => {
    clearTimeout(debounceRef.current);
    controllerRef.current?.abort();
    requestRef.current += 1;
  }, []);

  // Close suggestions when clicking outside the panel
  useEffect(() => {
    function handleOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Debounced autocomplete — waits 300ms after user stops typing 
  function handleChange(e) {
    onSearchStart();
    const value = e.target.value;
    cancelPendingSearch();
    onQueryChange(value);
    setLoading(false);
    setStatus("");
    setError("");
    setNoResults(false);
    setSuggestions([]);
    if (value.trim().length > 2) {
      debounceRef.current = setTimeout(() => {
        runSearch(value, false);
      }, 300);
    }
  }

  async function runSearch(value, selectFirst) {
    cancelPendingSearch();
    const request = requestRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    lastSearchRef.current = { query: value, selectFirst };
    const timeout = setTimeout(() => controller.abort(), 12000);
    setLoading(true);
    setStatus("");
    setError("");
    setNoResults(false);
    setSuggestions([]);
    try {
      onSearchStart();
      const results = await searchPlayers(value, controller.signal, season);
      if (request !== requestRef.current) return;
      if (results.length === 0) {
        setNoResults(true);
        setStatus(`No players found for "${value.trim()}" in the ${formatSeason(season)} Premier League dataset. Try another name or season.`);
      } else if (selectFirst) {
        pickSuggestion(results[0]);
      } else {
        setSuggestions(results.slice(0, 5));
        setStatus(`${Math.min(results.length, 5)} results available.`);
      }
    } catch (failure) {
      if (request !== requestRef.current) return;
      if (failure?.kind === "plan") onAccessDenied(failure);
      setError(controller.signal.aborted
        ? "The search timed out. Please retry."
        : failure instanceof TypeError || failure instanceof SyntaxError
          ? "Player search could not connect. Please check your connection and retry."
          : failure?.message || "Player search failed. Please retry.");
    } finally {
      clearTimeout(timeout);
      if (request === requestRef.current) setLoading(false);
    }
  }

  // Pressing Enter triggers the same search as clicking the button
  function handleKeyDown(e) {
    if (e.key === "Enter") handleSearch();
  }

  function handleSearch() {
    if (query.trim().length < 3 || !seasons.some((item) => item.year === season)) return;
    runSearch(query, true);
  }

  // When the user clicks a suggestion, select that player immediately
  // and clear the dropdown — no need to press Search
  function pickSuggestion(p) {
    cancelPendingSearch();
    onSelect(p);
    setLoading(false);
    setError("");
    setStatus("");
    setNoResults(false);
    setSuggestions([]);
  }

  const info  = player?.player;
  const stats = player?.statistics?.[0];

  return (
    <div className="player-panel" ref={wrapperRef} role="group" aria-label={label}>

      {/* Top label: "PLAYER A" / "PLAYER B" */}
      <div className="panel-label-row">
        <label className="panel-label" htmlFor={inputId}>{label}</label>
        {/* Show a small "Selected" indicator when a player is chosen */}
        {player && <span className="panel-selected-tag">✓ Selected</span>}
      </div>

      <div className="season-field">
        <label htmlFor={`${inputId}-season`}>Season</label>
        <select id={`${inputId}-season`} aria-label={`${label} season`} value={season}
          disabled={!seasons.length || navigationBusy} onChange={(event) => {
            cancelPendingSearch();
            setSuggestions([]); setLoading(false); setStatus(""); setError(""); setNoResults(false);
            onSeasonChange(Number(event.target.value));
          }}>
          {seasons.map((item) => <option key={item.year} value={item.year}>{formatSeason(item.year)}{item.current ? " (current)" : ""}</option>)}
        </select>
      </div>

      {/*  Image and info area 
          This div is always the same height which is set in CSS via min-height.
          What's INSIDE changes depending on whether a player is selected. */}

      <div className="panel-body">
        {player ? (
          //  Player selected 
          <div className="panel-player-info">
            {/* Circle photo — constrained size so no stretching ever happens */}
            <div className="panel-photo-ring">
              <img
                src={info.photo}
                alt={info.name}
                className="panel-photo"
              />
            </div>

            <h3 className="panel-player-name">{info.name}</h3>

            {/* Club row: small club logo + club name */}
            <div className="panel-club-row">
              {stats?.team?.logo && (
                <img
                  src={stats.team.logo}
                  alt=""
                  className="panel-club-logo"
                />
              )}
              <span className="panel-club-name">
                {playerClub(player)}
              </span>
            </div>

            {/* Position badge — colour coded same as rest of the app */}
            <span className={`position-badge ${positionClass(stats?.games?.position)}`}>
              {stats?.games?.position ?? "—"}
            </span>
          </div>
        ) : (
          //  Empty state 
          <div className="panel-empty">
            <GiSoccerBall className="panel-empty-icon" />
            <span className="panel-empty-text">Selection Pending...</span>
          </div>
        )}
      </div>

      {/*  Search input + suggestions 
          Always visible at the bottom of the panel.
          position: relative on this wrapper makes the absolute-positioned
          dropdown align to the input, not the whole page. */}
      <div className="panel-search-wrap">
        <div className="panel-input-row">
          <input
            id={inputId}
            type="text"
            disabled={!seasons.length || navigationBusy}
            maxLength={120}
            autoComplete="off"
            aria-describedby={`${inputId}-status`}
            className="panel-input"
            placeholder={placeholder}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="panel-search-btn"
            aria-label={`Search ${label}`}
            onClick={handleSearch}
            disabled={loading || navigationBusy || !seasons.length || query.trim().length < 3}
          >
            <FaSearch aria-hidden="true" /> {loading ? "Searching..." : "Search"}
          </button>
        </div>

        <p id={`${inputId}-status`} className="search-status" role={error ? "alert" : "status"}>
          {error || (loading ? "Searching players..." : status)}
        </p>
        {(error || noResults) && (
          <button type="button" className="search-retry" disabled={loading} onClick={() => {
            const last = lastSearchRef.current;
            if (last) runSearch(last.query, last.selectFirst);
          }}>
            <FaRedo aria-hidden="true" /> Retry search
          </button>
        )}

        {/* Suggestion dropdown
            Each row: [small photo] [player name] [team name — pushed right]
            The team name on the right is the key feature for same-name players */}
        {suggestions.length > 0 && (
          <ul className="suggestion-list" aria-label={`${label} results`}>
            {suggestions.map((p) => (
              <li key={p.player.id}>
                <button type="button" onClick={() => pickSuggestion(p)} aria-label={`Select ${p.player.name} (${p.statistics?.[0]?.team?.name ?? "Club unavailable"})`}>
                <img
                  src={p.player.photo}
                  alt=""
                  className="suggestion-photo"
                />
                <span className="suggestion-name">{p.player.name}</span>
                <span className="suggestion-team">
                  {p.statistics?.[0]?.team?.name ?? ""}
                </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}

// Maps position string to a CSS badge class — same system used in PlayerCard
function positionClass(pos) {
  return { Attacker: "badge-red", Midfielder: "badge-green",
           Defender: "badge-blue", Goalkeeper: "badge-amber" }[pos] ?? "badge-gray";
}

 
// MAIN PAGE
 
function LandingPage({ player1, player2, onSelectPlayer1, onSelectPlayer2,
  query1, query2, onQueryChange, navigationBusy, onClearComparison,
  season1, season2, seasons, availability, seasonLoading, seasonError, onRetrySeasons,
  onSeasonChange, onAccessDenied, onSearchStart }) {
  const navigate   = useNavigate();
  const bothLoaded = player1 && player2;

  function handleCompare() {
    if (!bothLoaded) return;
    navigate("/compare");
  }

  return (
    <div className="landing-container">

      {/*  HERO  */}
      <section className="hero">
        <div className="powered-badge">
          <FaStar className="powered-icon" />
          DATA FROM API-SPORTS
        </div>

        {/* Three-part title: white / blue-gradient / gold
            Each part is a separate span so we can colour them independently */}
        <h1 className="hero-title">
          COMPARE THE BEST OF
          <span className="hero-title-line2">
            <span className="hero-the-pl">THE PL </span>
            <span className="hero-2025">BY SEASON</span>
          </span>
        </h1>

        <p className="hero-subtitle">
          Analyze head-to-head performance metrics for your favorite Premier
          League players across the seasons available through your API plan.
        </p>
      </section>

      <div className="season-availability">
        <p className="data-note" role="status">{seasonLoading ? "Checking Premier League season availability..." : availability.notice || "Player-season coverage is supplied by API-SPORTS. Available years depend on coverage and your API plan."}</p>
        {seasonError && <p className="data-note" role="alert">{seasonError}</p>}
        {!seasons.length && <p className="data-note" role="alert">No covered player seasons are accessible within your current plan and the 2016/17-or-later range.</p>}
        <button className="search-retry" type="button" onClick={onRetrySeasons} disabled={seasonLoading}>
          <FaRedo aria-hidden="true" /> Refresh seasons
        </button>
        <button className="search-retry" type="button" onClick={onClearComparison} disabled={!player1 && !player2 && !query1 && !query2}>
          <FaTrash aria-hidden="true" /> Clear comparison
        </button>
      </div>

      {/*  PLAYER SELECTION  */}
      <section className="selection-section">

        <PlayerPanel
          label="Player A"
          placeholder="Search Player A (e.g. Haaland)..."
          player={player1}
          onSelect={onSelectPlayer1}
          query={query1} onQueryChange={(value) => onQueryChange(1, value)} navigationBusy={navigationBusy}
          season={season1} seasons={seasons} onSeasonChange={(year) => onSeasonChange(1, year)}
          onAccessDenied={onAccessDenied} onSearchStart={onSearchStart}
        />

        {/* VS badge: filled circle between the two panels */}
        <div className="vs-badge">VS</div>

        <PlayerPanel
          label="Player B"
          placeholder="Search Player B (e.g. Salah)..."
          player={player2}
          onSelect={onSelectPlayer2}
          query={query2} onQueryChange={(value) => onQueryChange(2, value)} navigationBusy={navigationBusy}
          season={season2} seasons={seasons} onSeasonChange={(year) => onSeasonChange(2, year)}
          onAccessDenied={onAccessDenied} onSearchStart={onSearchStart}
        />

      </section>

      {/*  COMPARE BUTTON  */}
      <section className="compare-action">
        <button
          className={`compare-pill-btn ${bothLoaded ? "compare-pill-btn--active" : ""}`}
          onClick={handleCompare}
          disabled={!bothLoaded}
        >
          <TbChartArrows className="compare-btn-icon" />
          {bothLoaded ? "COMPARE PLAYERS" : "SELECT BOTH PLAYERS FIRST"}
        </button>
      </section>

      {/*  FEATURE HIGHLIGHTS  */}
      <section className="features-section">
        {[
          { icon: <TbChartArrows />, title: "Season Statistics",
            desc: "Compare available goals, assists, shots, passes and defensive totals across selected seasons." },
          { icon: <MdOutlineTimer />, title: "Simulated Timeline",
            desc: "Explore an illustrative progression based on season totals, not recorded match history." },
          { icon: <MdBarChart />, title: "Head-to-Head Charts",
            desc: "View pair-relative radar scores, raw totals and shares of combined goal contributions." },
        ].map((f) => (
          <div className="feature-item" key={f.title}>
            <div className="feature-icon-wrap">{f.icon}</div>
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-desc">{f.desc}</p>
          </div>
        ))}
      </section>

    </div>
  );
}

export default LandingPage;
