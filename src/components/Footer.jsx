import { Link } from "react-router-dom";

import { 
  FaHome,
  FaChartBar,
  FaUser
} from "react-icons/fa";

import { GiSoccerBall } from "react-icons/gi";


function Footer() {

return (

<footer className="footer">

<div className="footer-container">

{/* LEFT */}
<div className="footer-section">
<h3><GiSoccerBall /> PL Compare</h3>
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
<Link to="/about">
<FaUser /> About
</Link>
</li>

</ul>
</div>

{/* RIGHT */}
<div className="footer-section">
<h4>Contact</h4>
<p>Email: support@plcompare.com</p>
<p>© 2026 PL Compare</p>
</div>

</div>

</footer>

);

}

export default Footer;