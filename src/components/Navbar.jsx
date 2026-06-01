import { useState } from "react";
import { Link } from "react-router-dom";

import { 
  FaBars,
  FaHome,
  FaChartBar,
  FaShareAlt,
  FaCog,
  FaTimes
} from "react-icons/fa";

import { GiSoccerBall } from "react-icons/gi";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (

    <nav className={`navbar ${menuOpen ? "navbar--open" : ""}`}>

      <div className="logo">
        <GiSoccerBall />
        <span>PITCHSTATS</span>
      </div>

      <button
        className="nav-toggle"
        type="button"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
        aria-controls="primary-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <FaTimes /> : <FaBars />}
      </button>

      <ul id="primary-navigation" className="nav-links">

        <li>
          <Link to="/" onClick={closeMenu}>
            <FaHome />
            <span>HOME</span>
          </Link>
        </li>

        <li>
          <Link to="/compare" onClick={closeMenu}>
            <FaChartBar />
            <span>COMPARE</span>
          </Link>
        </li>

        <li>
          <Link to="/timeline" onClick={closeMenu}>
            <FaChartBar />
            <span>STATS</span>
          </Link>
        </li>

        {/* <li>
          <Link to="/profile">
            <FaUser />
            <span>PROFILE</span>
          </Link>
        </li> */}

      </ul>

      <div className="nav-actions">
        <FaShareAlt />
        <FaCog />
      </div>

    </nav>

  );
}

export default Navbar;
