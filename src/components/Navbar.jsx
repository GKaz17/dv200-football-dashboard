import { useRef, useState } from "react";
import { Link } from "react-router-dom";

import { 
  FaBars,
  FaHome,
  FaChartBar,
  FaTimes
} from "react-icons/fa";

import { GiSoccerBall } from "react-icons/gi";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef(null);
  const closeMenu = () => setMenuOpen(false);

  return (

    <nav aria-label="Primary" className={`navbar ${menuOpen ? "navbar--open" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && menuOpen) {
          closeMenu();
          toggleRef.current?.focus();
        }
      }}>

      <Link className="logo" to="/" onClick={closeMenu} aria-label="PitchStats home">
        <GiSoccerBall />
        <span>PITCHSTATS</span>
      </Link>

      <button
        className="nav-toggle"
        type="button"
        ref={toggleRef}
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


    </nav>

  );
}

export default Navbar;
