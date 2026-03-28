import { useLocation } from "react-router-dom";
import PlayerCard from "../components/PlayerCard";

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement
} from "chart.js";

import { Bar, Pie, Radar } from "react-chartjs-2";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement
);

function ComparePage() {

const location = useLocation();

const player1 = location.state?.player1;
const player2 = location.state?.player2;

const stats1 = player1?.statistics?.[0];
const stats2 = player2?.statistics?.[0];

/*  DATA */
const comparisonData = {
  goals: [
    stats1?.goals?.total || 0,
    stats2?.goals?.total || 0
  ],
  assists: [
    stats1?.goals?.assists || 0,
    stats2?.goals?.assists || 0
  ],
  shots: [
    stats1?.shots?.total || 0,
    stats2?.shots?.total || 0
  ],
  passes: [
    stats1?.passes?.total || 0,
    stats2?.passes?.total || 0
  ]
};

/*  BAR */
const barData = {
  labels: ["Goals", "Assists", "Shots"],
  datasets: [
    {
      label: player1?.player?.name,
      data: [
        comparisonData.goals[0],
        comparisonData.assists[0],
        comparisonData.shots[0]
      ]
    },
    {
      label: player2?.player?.name,
      data: [
        comparisonData.goals[1],
        comparisonData.assists[1],
        comparisonData.shots[1]
      ]
    }
  ]
};

/*  PIE */
const pieData = {
  labels: ["Player 1", "Player 2"],
  datasets: [
    {
      data: [
        comparisonData.goals[0] + comparisonData.assists[0],
        comparisonData.goals[1] + comparisonData.assists[1]
      ]
    }
  ]
};

/*  RADAR */
const normalise = (value, max) => max === 0 ? 0 : (value / max) * 100;

const maxValues = {
  goals: Math.max(comparisonData.goals[0], comparisonData.goals[1]),
  assists: Math.max(comparisonData.assists[0], comparisonData.assists[1]),
  shots: Math.max(comparisonData.shots[0], comparisonData.shots[1]),
  passes: Math.max(comparisonData.passes[0], comparisonData.passes[1])
};

const radarData = {
  labels: ["Goals", "Assists", "Shots", "Passes"],
  datasets: [
    {
      label: player1?.player?.name,
      data: [
  normalise(comparisonData.goals[0], maxValues.goals),
  normalise(comparisonData.assists[0], maxValues.assists),
  normalise(comparisonData.shots[0], maxValues.shots),
  normalise(comparisonData.passes[0], maxValues.passes)
]
    },
    {
      label: player2?.player?.name,
     data: [
  normalise(comparisonData.goals[0], maxValues.goals),
  normalise(comparisonData.assists[0], maxValues.assists),
  normalise(comparisonData.shots[0], maxValues.shots),
  normalise(comparisonData.passes[0], maxValues.passes)
]
    }
  ]
};

return (

<div>

{/*  TOP SECTION */}
<div className="compare-top">
  <PlayerCard player={player1} />
  <div className="vs">VS</div>
  <PlayerCard player={player2} />
</div>

{/*  RADAR */}
<div className="chart-section">
  <Radar data={radarData} />
</div>

{/*  BAR */}
<div className="chart-section">
  <Bar data={barData} />
</div>

{/*  PIE */}
<div className="chart-section">
  <Pie data={pieData} />
</div>

</div>

);

}

export default ComparePage;