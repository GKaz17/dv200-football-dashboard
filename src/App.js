import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Navigate, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ComparePage from "./pages/ComparePage";
import TimelinePage from "./pages/TimelinePage";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { SEASON, formatSeason } from "./playerData";
import { loadSeasonAvailability, searchPlayers } from "./playerSearch";
import { clearSavedSelection, readSelection, saveSelection } from "./selectionStorage";
import "./App.css";

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selection, setSelection] = useState(readSelection);
  const { player1, player2, season1, season2, query1, query2 } = selection;
  const [availability, setAvailability] = useState(() => ({
    all: [...new Set([season1, season2, SEASON])].sort((a, b) => b - a).map((year) => ({ year })),
    range: null, notice: "",
  }));
  const [availabilityVerified, setAvailabilityVerified] = useState(false);
  const [seasonLoading, setSeasonLoading] = useState(true);
  const [seasonError, setSeasonError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [navigationBusy, setNavigationBusy] = useState(false);
  const [navigationError, setNavigationError] = useState("");
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const navigationRequest = useRef(null);
  const touched = useRef(Boolean(player1 || player2 || query1 || query2 || season1 !== SEASON || season2 !== SEASON));
  const seasons = useMemo(() => availability.all.filter((item) =>
    !availability.range || (item.year >= availability.range.first && item.year <= availability.range.last)), [availability]);

  useEffect(() => { setStorageUnavailable(!saveSelection(selection)); }, [selection]);
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => () => navigationRequest.current?.abort(), []);
  useEffect(() => {
    const restore = (event) => {
      if (event.persisted) { touched.current = true; setSelection(readSelection()); }
    };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setSeasonLoading(true); setSeasonError("");
    loadSeasonAvailability(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setAvailability(result); setAvailabilityVerified(true);
      const accessible = result.all.filter((item) => !result.range || (item.year >= result.range.first && item.year <= result.range.last));
      if (!touched.current && accessible.length) {
        setSelection((previous) => ({ ...previous, season1: accessible[0].year, season2: accessible[0].year }));
      }
    }).catch((error) => {
      if (!controller.signal.aborted) setSeasonError(error.kind === "quota" ? error.message : "The season list could not be loaded. The previous selection is retained; retry to check other seasons.");
    }).finally(() => { if (!controller.signal.aborted) setSeasonLoading(false); });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (!availabilityVerified) return;
    setSelection((previous) => {
      let next = previous;
      for (const slot of [1, 2]) {
        if (!seasons.some((item) => item.year === previous[`season${slot}`])) {
          if (next === previous) next = { ...previous };
          next[`season${slot}`] = seasons[0]?.year ?? previous[`season${slot}`];
          next[`player${slot}`] = null; next[`query${slot}`] = "";
        }
      }
      return next;
    });
  }, [seasons, availabilityVerified, season1, season2]);

  function cancelNavigation() {
    navigationRequest.current?.abort();
    navigationRequest.current = null;
    setNavigationBusy(false);
  }
  function accessDenied(error) {
    if (error.range) {
      setAvailability((previous) => ({ ...previous, range: error.range, notice: error.message }));
      setAvailabilityVerified(true);
    }
  }
  function chooseSeason(slot, year) {
    cancelNavigation(); setNavigationError(""); touched.current = true;
    setSelection((previous) => ({ ...previous, [`season${slot}`]: year, [`player${slot}`]: null, [`query${slot}`]: "" }));
  }
  function changeQuery(slot, query) {
    cancelNavigation(); setNavigationError(""); touched.current = true;
    setSelection((previous) => ({
      ...previous, [`query${slot}`]: query,
      [`player${slot}`]: previous[`player${slot}`]?.player.name === query ? previous[`player${slot}`] : null,
    }));
  }
  function selectPlayer(slot, player) {
    touched.current = true; setNavigationError("");
    setSelection((previous) => ({
      ...previous, [`player${slot}`]: { ...player, selectedAt: Date.now() },
      [`query${slot}`]: player.player.name,
    }));
  }
  function clearComparison() {
    cancelNavigation(); setNavigationError(""); clearSavedSelection();
    setSelection((previous) => ({ ...previous, player1: null, player2: null, query1: "", query2: "" }));
  }

  async function navigateTo(target) {
    cancelNavigation(); setNavigationError("");
    if (target === "/" || (player1 && player2)) { navigate(target); return; }
    const controller = new AbortController();
    navigationRequest.current = controller;
    touched.current = true; setNavigationBusy(true);
    try {
      const records = [];
      for (const slot of [1, 2]) {
        let record = selection[`player${slot}`];
        if (!record) {
          const query = selection[`query${slot}`].trim();
          const season = selection[`season${slot}`];
          if (query.length < 3) throw new Error(`Player ${slot === 1 ? "A" : "B"} needs a name of at least three characters.`);
          const results = await searchPlayers(query, controller.signal, season);
          if (controller.signal.aborted) return;
          if (!results.length) throw new Error(`No Player ${slot === 1 ? "A" : "B"} match was found for "${query}" in ${formatSeason(season)}. Your searches are retained.`);
          record = { ...results[0], selectedAt: Date.now() };
          setSelection((previous) => ({ ...previous, [`player${slot}`]: record, [`query${slot}`]: record.player.name }));
        }
        records.push(record);
      }
      if (controller.signal.aborted) return;
      setSelection((previous) => ({ ...previous, player1: records[0], player2: records[1], query1: records[0].player.name, query2: records[1].player.name }));
      navigate(target);
    } catch (error) {
      if (!controller.signal.aborted) {
        accessDenied(error);
        setNavigationError(error instanceof TypeError ? "The player service could not connect. Your searches are retained; please retry." : error.message);
        navigate("/");
      }
    } finally {
      if (navigationRequest.current === controller) { navigationRequest.current = null; setNavigationBusy(false); }
    }
  }

  return (
    <>
      <Navbar onNavigate={navigateTo} busy={navigationBusy} />
      {navigationError && <p className="navigation-feedback" role="alert">{navigationError}</p>}
      {storageUnavailable && <p className="navigation-feedback" role="status">Browser storage is unavailable. Selections are retained only while this tab remains open.</p>}
      <Routes>
        <Route path="/" element={<LandingPage
          player1={player1} player2={player2} onSelectPlayer1={(player) => selectPlayer(1, player)} onSelectPlayer2={(player) => selectPlayer(2, player)}
          query1={query1} query2={query2} onQueryChange={changeQuery} navigationBusy={navigationBusy} onClearComparison={clearComparison}
          season1={season1} season2={season2} seasons={seasons} availability={availability}
          seasonLoading={seasonLoading} seasonError={seasonError} onRetrySeasons={() => setRefresh((value) => value + 1)}
          onSeasonChange={chooseSeason} onAccessDenied={accessDenied} onSearchStart={() => { touched.current = true; }}
        />} />
        <Route path="/compare" element={<ComparePage player1={player1} player2={player2} />} />
        <Route path="/timeline" element={<TimelinePage player1={player1} player2={player2} seasons={seasons} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer onNavigate={navigateTo} />
    </>
  );
}

function App() { return <BrowserRouter><AppContent /></BrowserRouter>; }
export default App;
