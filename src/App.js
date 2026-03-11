import logo from './logo.svg';
import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import ComparePage from "./pages/ComparePage";
import TimelinePage from "./pages/TimelinePage";

import './App.css';
import Navbar from "./components/Navbar";

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }


function App() {
  return (
    
    <div>

      <Navbar />

      { (
    <BrowserRouter>

      <Navbar />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/timeline" element={<TimelinePage />} />
      </Routes>

    </BrowserRouter>
  )}

    </div>
  );
}


export default App;
