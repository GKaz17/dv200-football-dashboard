import { useEffect, useState } from "react";

function LandingPage() {

  const [player, setPlayer] = useState(null);

  useEffect(() => {

    fetch("https://v3.football.api-sports.io/players?search=Messi", {
      headers: {
        "x-apisports-key": "181b4fe6ab467f7df7d4e1d6f6a2ea05"
      }
    })
      .then(response => response.json())
      .then(data => {
        setPlayer(data.response[0]);
      });

  }, []);

  return (

    <div>

      <h1>PitchStats</h1>
      <h2>Player Data Test</h2>

      {player && (
        <div>

          <h3>{player.player.name}</h3>

          <img
            src={player.player.photo}
            alt="player"
            width="120"
          />

          <p>Age: {player.player.age}</p>
          <p>Nationality: {player.player.nationality}</p>

        </div>
      )}

    </div>

  );
}

export default LandingPage;