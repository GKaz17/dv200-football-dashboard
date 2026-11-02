import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import ComparePage from "./pages/ComparePage";
import TimelinePage from "./pages/TimelinePage";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import "./App.css";

function App() {
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);

  return (

    <BrowserRouter>

      <Navbar />

      <Routes>
        <Route path="/" element={<LandingPage player1={player1} player2={player2} onSelectPlayer1={setPlayer1} onSelectPlayer2={setPlayer2} />} />
        <Route path="/compare" element={<ComparePage player1={player1} player2={player2} />} />
        <Route path="/timeline" element={<TimelinePage player1={player1} player2={player2} />} />
      </Routes>

    <Footer />

    </BrowserRouter>

  );
}


export default App;
