import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ComparePage from "./pages/ComparePage";
import TimelinePage from "./pages/TimelinePage";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { SEASON } from "./playerData";
import { loadSeasonAvailability } from "./playerSearch";
import "./App.css";

function App() {
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [season1, setSeason1] = useState(SEASON);
  const [season2, setSeason2] = useState(SEASON);
  const [availability, setAvailability] = useState({ all: [{ year: SEASON }], range: null, notice: "" });
  const [seasonLoading, setSeasonLoading] = useState(true);
  const [seasonError, setSeasonError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const touched = useRef(false);
  const seasons = useMemo(() => availability.all.filter((item) =>
    !availability.range || (item.year >= availability.range.first && item.year <= availability.range.last)), [availability]);

  useEffect(() => {
    const controller = new AbortController();
    setSeasonLoading(true);
    setSeasonError("");
    loadSeasonAvailability(controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setAvailability(result);
      const accessible = result.all.filter((item) => !result.range || (item.year >= result.range.first && item.year <= result.range.last));
      if (!touched.current && accessible.length) {
        setSeason1(accessible[0].year);
        setSeason2(accessible[0].year);
      }
    }).catch((error) => {
      if (!controller.signal.aborted) setSeasonError(error.kind === "quota" ? error.message : "The season list could not be loaded. The previous selection is retained; retry to check other seasons.");
    }).finally(() => { if (!controller.signal.aborted) setSeasonLoading(false); });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (!seasons.length) { setPlayer1(null); setPlayer2(null); return; }
    if (!seasons.some((item) => item.year === season1)) { setSeason1(seasons[0].year); setPlayer1(null); }
    if (!seasons.some((item) => item.year === season2)) { setSeason2(seasons[0].year); setPlayer2(null); }
  }, [seasons, season1, season2]);

  function accessDenied(error) {
    if (error.range) setAvailability((previous) => ({ ...previous, range: error.range, notice: error.message }));
  }
  function chooseSeason(slot, year) {
    touched.current = true;
    if (slot === 1) { setSeason1(year); setPlayer1(null); }
    else { setSeason2(year); setPlayer2(null); }
  }

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage
          player1={player1} player2={player2} onSelectPlayer1={setPlayer1} onSelectPlayer2={setPlayer2}
          season1={season1} season2={season2} seasons={seasons} availability={availability}
          seasonLoading={seasonLoading} seasonError={seasonError} onRetrySeasons={() => setRefresh((value) => value + 1)}
          onSeasonChange={chooseSeason} onAccessDenied={accessDenied} onSearchStart={() => { touched.current = true; }}
        />} />
        <Route path="/compare" element={<ComparePage player1={player1} player2={player2} />} />
        <Route path="/timeline" element={<TimelinePage player1={player1} player2={player2} seasons={seasons} />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
