import { Link } from "react-router-dom";

import { 
  FaHome,
  FaChartBar,
  FaUser,
  FaShareAlt,
  FaCog
} from "react-icons/fa";

import { GiSoccerBall } from "react-icons/gi";

function Navbar() {
  return (

    <nav className="navbar">

      <div className="logo">
        <GiSoccerBall />
        <span>PITCHSTATS</span>
      </div>

      <ul className="nav-links">

        <li>
          <Link to="/">
            <FaHome />
            <span>HOME</span>
          </Link>
        </li>

        <li>
          <Link to="/compare">
            <FaChartBar />
            <span>COMPARE</span>
          </Link>
        </li>

        <li>
          <Link to="/timeline">
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