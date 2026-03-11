import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav>

      <h2>Football Analytics</h2>

      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>

        <li>
          <Link to="/compare">Compare</Link>
        </li>

        <li>
          <Link to="/timeline">Timeline</Link>
        </li>

      </ul>

    </nav>
  );
}

export default Navbar;