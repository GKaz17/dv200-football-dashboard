import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FaBars, FaHome, FaChartBar, FaChartLine, FaTimes } from "react-icons/fa";
import { GiSoccerBall } from "react-icons/gi";

function Navbar({ onNavigate, busy = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef(null);
  const location = useLocation();
  useEffect(() => setMenuOpen(false), [location.pathname]);

  function follow(event, target) {
    setMenuOpen(false);
    if (onNavigate && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      onNavigate(target);
    }
  }

  return (
    <nav aria-label="Primary" aria-busy={busy} className={`navbar ${menuOpen ? "navbar--open" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && menuOpen) {
          setMenuOpen(false); toggleRef.current?.focus();
        }
      }}>
      <div className="navbar-inner">
        <NavLink className="logo" to="/" end onClick={(event) => follow(event, "/")} aria-label="PitchStats home">
          <GiSoccerBall /><span>PITCHSTATS</span>
        </NavLink>
        <button className="nav-toggle" type="button" ref={toggleRef}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen} aria-controls="primary-navigation"
          onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
        <ul id="primary-navigation" className="nav-links">
          <li><NavLink to="/" end onClick={(event) => follow(event, "/")}><FaHome /><span>HOME</span></NavLink></li>
          <li><NavLink to="/compare" onClick={(event) => follow(event, "/compare")}><FaChartBar /><span>COMPARE</span></NavLink></li>
          <li><NavLink to="/timeline" onClick={(event) => follow(event, "/timeline")}><FaChartLine /><span>TIMELINE</span></NavLink></li>
        </ul>
        {busy && <span className="nav-pending" role="status">Finding players...</span>}
      </div>
    </nav>
  );
}

export default Navbar;
