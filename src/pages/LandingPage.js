import { useEffect, useState } from "react";



function LandingPage() {

  const [player, setPlayer] = useState();
  const [data, setData] = useState([]);
  useEffect(() => {

fetch("https://v3.football.api-sports.io/players?team=31&season=2024", {
  method: "GET",
  headers: {
    "x-apisports-key": "52aebd1e39b84ac26ae09e2f7fc54da2"
  }
})
.then(res => res.json())
.then(data => {
  console.log(data);
  setPlayer(data.response[0]);
  setData(data.response[0]);
})
.catch(err => console.log(err));

}, []);

//   var myHeaders = new Headers();
// myHeaders.append("x-apisports-key", "52aebd1e39b84ac26ae09e2f7fc54da2");

// var requestOptions = {
//   method: 'GET',
//   headers: myHeaders,
//   redirect: 'follow'
// };

// fetch("https://v3.football.api-sports.io/players?search=Mandzukic", requestOptions)
//   .then(response => response.text())
//   .then(result => console.log(result))
//   .catch(error => console.log('error', error));

//   }, []);

return (

  <div>

    <h1>PitchStats</h1>

    <h1>Compare the best of Players</h1>
    <h2>Player Data Test</h2>

    {player && (
      <div> 

        <h3>{player.player.name}</h3>

        <img
          src={player.player.photo}
          alt="player"
          width="150"
          height="150"
        />

        <p>Age: {player.player.age}</p>
        <p>Nationality: {player.player.nationality}</p>
        <p>Height: {player.player.height}</p>
         <p>Weight: {player.player.weight}</p>
          <p>League: {player.player.league}</p>

      </div>
    )}

  </div>

);
}

export default LandingPage;