function PlayerCard({ player }) {

if (!player) {
  return (
    <div className="player-card">
      <div className="placeholder-img"></div>
      <h3>No Player</h3>
    </div>
  );
}

const stats = player.statistics?.[0];

return (

<div className="player-card">

<img 
  src={player.player.photo} 
  alt={player.player.name} 
/>

<h3>{player.player.name}</h3>

<p>{stats?.team?.name}</p>
<p>{stats?.games?.position}</p>

<p>Goals: {stats?.goals?.total || 0}</p>
<p>Assists: {stats?.goals?.assists || 0}</p>

</div>

);

}

export default PlayerCard;