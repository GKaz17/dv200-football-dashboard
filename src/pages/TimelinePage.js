import React, { useState } from "react";
import { useLocation } from "react-router-dom";

import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from "chart.js";

import { Line } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

function TimelinePage() {

  //  GET DATA FROM NAV
  const location = useLocation();
  const player1 = location.state?.player1;
  const player2 = location.state?.player2;

  //  STATE 
  const [selectedStat, setSelectedStat] = useState("goals");

  const statOptions = ["goals", "assists", "shots", "passes", "tackles"];

  // HELPER FUNCTION
  const generateTimeline = (baseValue) => {
    return [
      baseValue * 0.2,
      baseValue * 0.4,
      baseValue * 0.6,
      baseValue * 0.8,
      baseValue
    ];
  };

  //EXTRACT THE STATS
  const player1Stats = player1?.statistics?.[0];
  const player2Stats = player2?.statistics?.[0];

  const statMap = {
    goals: player1Stats?.goals?.total || 0,
    assists: player1Stats?.goals?.assists || 0,
    shots: player1Stats?.shots?.total || 0,
    passes: player1Stats?.passes?.total || 0,
    tackles: player1Stats?.tackles?.total || 0
  };

  const statMap2 = {
    goals: player2Stats?.goals?.total || 0,
    assists: player2Stats?.goals?.assists || 0,
    shots: player2Stats?.shots?.total || 0,
    passes: player2Stats?.passes?.total || 0,
    tackles: player2Stats?.tackles?.total || 0
  };

  // CHART DATA
  const lineData = {
    labels: ["Game 1", "Game 2", "Game 3", "Game 4", "Game 5"],
    datasets: [
      {
        label: player1?.player?.name,
        data: generateTimeline(statMap[selectedStat])
      },
      {
        label: player2?.player?.name,
        data: generateTimeline(statMap2[selectedStat])
      }
    ]
  };



  // RENDER
  return (
    <div>
      <h1>Performance Timeline</h1>

      <select
        value={selectedStat}
        onChange={(e) => setSelectedStat(e.target.value)}
      >
        {statOptions.map((stat) => (
          <option key={stat} value={stat}>
            {stat.toUpperCase()}
          </option>
        ))}
      </select>

      <Line data={lineData} />
    </div>
  );
}

export default TimelinePage;