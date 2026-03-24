import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import ComparePage from "./pages/ComparePage";
import TimelinePage from "./pages/TimelinePage";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import "./App.css";

function App() {
  return (

    <BrowserRouter>

      <Navbar />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/timeline" element={<TimelinePage />} />
      </Routes>

    <Footer />

    </BrowserRouter>

  );
}


export default App;