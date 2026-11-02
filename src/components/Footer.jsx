import { Link } from "react-router-dom";

import { 
  FaHome,
  FaChartBar,
  FaGithub
} from "react-icons/fa";

import { GiSoccerBall } from "react-icons/gi";


function Footer() {

return (

<footer className="footer">

<div className="footer-container">

{/* LEFT */}
<div className="footer-section">
<h3><GiSoccerBall /> PitchStats</h3>
<p>
Compare Premier League players and explore stats in a simple, interactive way.
</p>
</div>

{/* MIDDLE */}
<div className="footer-section">
<h4>Quick Links</h4>
<ul>

<li>
<Link to="/">
<FaHome /> Home
</Link>
</li>

<li>
<Link to="/compare">
<FaChartBar /> Compare
</Link>
</li>

<li>
<Link to="/timeline">
<FaChartBar /> Timeline
</Link>
</li>

</ul>
</div>

{/* RIGHT */}
<div className="footer-section">
<h4>Project</h4>
<a href="https://github.com/GKaz17/dv200-football-dashboard"><FaGithub /> GitHub repository</a>
<p>© {new Date().getFullYear()} PitchStats · Gedeon Kazadi</p>
</div>

</div>

</footer>

);

}

export default Footer;
