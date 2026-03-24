import { useLocation } from "react-router-dom";

function ComparePage() {

const location = useLocation();

const player1 = location.state?.player1;
const player2 = location.state?.player2;

console.log(player1, player2);

return (

<div>

<h1>Compare Page</h1>

{player1 && player2 ? (

<div>

<h2>{player1.player.name} vs {player2.player.name}</h2>

<img src={player1.player.photo} alt="player1" />
<img src={player2.player.photo} alt="player2" />

</div>

) : (

<p>No players selected</p>

)}

</div>

);

}

export default ComparePage;