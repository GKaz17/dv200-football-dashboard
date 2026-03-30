// LandingPage.js
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TbChartArrows } from "react-icons/tb";
import { MdOutlineTimer, MdShare } from "react-icons/md";
import { FaStar } from "react-icons/fa";
import { GiSoccerBall } from "react-icons/gi";

const API_KEY = "52aebd1e39b84ac26ae09e2f7fc54da2";

// One reusable fetch — both panels use this same function
function fetchPlayers(query) {
  return fetch(
    `https://v3.football.api-sports.io/players?search=${encodeURIComponent(query)}&league=39&season=2024`,
    { method: "GET", headers: { "x-apisports-key": API_KEY } }
  ).then((res) => res.json());
}

// PLAYER PANEL

// Suggestions:
//   Each suggestion row shows: [photo] [name] [team — right aligned]
//   This is the key UX fix for same-name players — you can see at a glance
//   which "Jones" or "Silva" you're picking.
// 
function PlayerPanel({ label, placeholder, player, onSelect }) {
  const [query, setQuery]             = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]         = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef  = useRef(null);

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
    const value = e.target.value;
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (value.length > 2) {
      debounceRef.current = setTimeout(() => {
        fetchPlayers(value).then((data) => {
          // Slice to 5 results max — any more and the dropdown gets unwieldy
          setSuggestions((data.response ?? []).slice(0, 5));
        });
      }, 300);
    } else {
      setSuggestions([]);
    }
  }

  // Pressing Enter triggers the same search as clicking the button
  function handleKeyDown(e) {
    if (e.key === "Enter") handleSearch();
  }

  function handleSearch() {
    if (query.trim().length < 3) return;
    setLoading(true);
    setSuggestions([]);
    fetchPlayers(query).then((data) => {
      if (data.response?.length > 0) {
        onSelect(data.response[0]);
        setQuery(data.response[0].player.name);
      }
      setLoading(false);
    });
  }

  // When the user clicks a suggestion, select that player immediately
  // and clear the dropdown — no need to press Search
  function pickSuggestion(p) {
    onSelect(p);
    setQuery(p.player.name);
    setSuggestions([]);
  }

  const info  = player?.player;
  const stats = player?.statistics?.[0];

  return (
    <div className="player-panel" ref={wrapperRef}>

      {/* Top label: "PLAYER A" / "PLAYER B" */}
      <div className="panel-label-row">
        <span className="panel-label">{label}</span>
        {/* Show a small "Selected" indicator when a player is chosen */}
        {player && <span className="panel-selected-tag">✓ Selected</span>}
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
                {stats?.team?.name ?? "—"}
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
            type="text"
            className="panel-input"
            placeholder={placeholder}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
          <button
            className="panel-search-btn"
            onClick={handleSearch}
            disabled={loading || query.trim().length < 3}
          >
            {loading ? "..." : "Search"}
          </button>
        </div>

        {/* Suggestion dropdown
            Each row: [small photo] [player name] [team name — pushed right]
            The team name on the right is the key feature for same-name players */}
        {suggestions.length > 0 && (
          <ul className="suggestion-list">
            {suggestions.map((p, i) => (
              <li key={i} onClick={() => pickSuggestion(p)}>
                <img
                  src={p.player.photo}
                  alt=""
                  className="suggestion-photo"
                />
                <span className="suggestion-name">{p.player.name}</span>
                <span className="suggestion-team">
                  {p.statistics?.[0]?.team?.name ?? ""}
                </span>
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
 
function LandingPage() {
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const navigate   = useNavigate();
  const bothLoaded = player1 && player2;

  function handleCompare() {
    if (!bothLoaded) return;
    navigate("/compare", { state: { player1, player2 } });
  }

  return (
    <div className="landing-container">

      {/*  HERO  */}
      <section className="hero">
        <div className="powered-badge">
          <FaStar className="powered-icon" />
          POWERED BY OPTA DATA
        </div>

        {/* Three-part title: white / blue-gradient / gold
            Each part is a separate span so we can colour them independently */}
        <h1 className="hero-title">
          COMPARE THE BEST OF
          <span className="hero-title-line2">
            <span className="hero-the-pl">THE PL </span>
            <span className="hero-2025">2025</span>
          </span>
        </h1>

        <p className="hero-subtitle">
          Analyze head-to-head performance metrics for your favorite Premier
          League stars with professional-grade analytics.
        </p>
      </section>

      {/*  PLAYER SELECTION  */}
      <section className="selection-section">

        <PlayerPanel
          label="PLAYER A"
          placeholder="Search Player A (e.g. Haaland)..."
          player={player1}
          onSelect={setPlayer1}
        />

        {/* VS badge: filled circle between the two panels */}
        <div className="vs-badge">VS</div>

        <PlayerPanel
          label="PLAYER B"
          placeholder="Search Player B (e.g. Salah)..."
          player={player2}
          onSelect={setPlayer2}
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
          { icon: <TbChartArrows />, title: "Advanced Metrics",
            desc: "xG, xA, progressive carries, and heatmap overlays for every player." },
          { icon: <MdOutlineTimer />, title: "Live Data",
            desc: "Stats updated in real-time as the 2024/25 season unfolds." },
          { icon: <MdShare />, title: "Export Insights",
            desc: "Generate beautiful comparison charts to share on social media." },
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