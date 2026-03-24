import { useState } from "react";
import { useNavigate } from "react-router-dom";

function LandingPage() {

  const navigate = useNavigate();

const [player1, setPlayer1] = useState();
const [player2, setPlayer2] = useState();

const [search1, setSearch1] = useState("");
const [search2, setSearch2] = useState("");

const [suggestions1, setSuggestions1] = useState([]);
const [suggestions2, setSuggestions2] = useState([]);

const API_KEY = "52aebd1e39b84ac26ae09e2f7fc54da2";

//  SEARCH FUNCTIONS 

function searchPlayer1() {

fetch(`https://v3.football.api-sports.io/players?search=${search1}&league=39&season=2024`, {
  method: "GET",
  headers: { "x-apisports-key": API_KEY }
})
.then(res => res.json())
.then(data => {

if(data.response && data.response.length > 0){
setPlayer1(data.response[0]);
}

});

}

function searchPlayer2() {

fetch(`https://v3.football.api-sports.io/players?search=${search2}&league=39&season=2024`, {
  method: "GET",
  headers: { "x-apisports-key": API_KEY }
})
.then(res => res.json())
.then(data => {

if(data.response && data.response.length > 0){
setPlayer2(data.response[0]);
}

})
.catch(err => console.log(err));

}

//  AUTOCOMPLETE 

function getSuggestions1(value){

fetch(`https://v3.football.api-sports.io/players?search=${value}&league=39&season=2024`, {
  method: "GET",
  headers: { "x-apisports-key": API_KEY }
})
.then(res => res.json())
.then(data => {

setSuggestions1(data.response.slice(0,5));

});

}

function getSuggestions2(value){

fetch(`https://v3.football.api-sports.io/players?search=${value}&league=39&season=2024`, {
  method: "GET",
  headers: { "x-apisports-key": API_KEY }
})
.then(res => res.json())
.then(data => {

setSuggestions2(data.response.slice(0,5));

});

}

//  UI 

return (

<div className="landing-container">

<h1 className="title">COMPARE THE BEST OF THE PL 24/25</h1>

{/*MAIN CONTAINER NOW HOLDS EVERYTHING */}
<div className="search-container">

<p className="subtitle">
Analyse head-to-head performance metrics for your favorite Premier
League stars with professional-grade analytics.
</p>

<div className="search-section">

{/* PLAYER 1 */}
<div className="search-box">
<input
placeholder="Search Player 1"
value={search1}
onChange={(e)=>{
const value = e.target.value;
setSearch1(value);
if(value.length > 2){
getSuggestions1(value);
}
}}
/>

<button onClick={searchPlayer1}>Search</button>

{suggestions1.length > 0 && (
<ul className="suggestion-list">
{suggestions1.map((p,index)=>(
<li key={index} onClick={()=>{
setPlayer1(p);
setSearch1(p.player.name);
setSuggestions1([]);
}}>
{p.player.name}
</li>
))}
</ul>
)}

</div>

{/* PLAYER 2 */}
<div className="search-box">
<input
placeholder="Search Player 2"
value={search2}
onChange={(e)=>{
const value = e.target.value;
setSearch2(value);
if(value.length > 2){
getSuggestions2(value);
}
}}
/>

<button onClick={searchPlayer2}>Search</button>

{suggestions2.length > 0 && (
<ul className="suggestion-list">
{suggestions2.map((p,index)=>(
<li key={index} onClick={()=>{
setPlayer2(p);
setSearch2(p.player.name);
setSuggestions2([]);
}}>
{p.player.name}
</li>
))}
</ul>
)}

</div>

</div>

{/*PLAYER CARDS NOW INSIDE SAME CONTAINER */}
<div className="players-container">

<div className="player-card">
{player1 ? (
<>
<img src={player1.player.photo} alt="player"/>
<h3>{player1.player.name}</h3>
<p>{player1.statistics?.[0]?.team?.name}</p>
<p>{player1.statistics?.[0]?.games?.position}</p>
<p>Goals: {player1.statistics?.[0]?.goals?.total || 0}</p>
<p>Assists: {player1.statistics?.[0]?.goals?.assists || 0}</p>
</>
) : (
<>
<div className="placeholder-img"></div>
<h3>Player 1</h3>
<p>Search for a player</p>
</>
)}
</div>

<div className="vs">VS</div>

<div className="player-card">
{player2 ? (
<>
<img src={player2.player.photo} alt="player"/>
<h3>{player2.player.name}</h3>
<p>{player2.statistics?.[0]?.team?.name}</p>
<p>{player2.statistics?.[0]?.games?.position}</p>
<p>Goals: {player2.statistics?.[0]?.goals?.total || 0}</p>
<p>Assists: {player2.statistics?.[0]?.goals?.assists || 0}</p>
</>
) : (
<>
<div className="placeholder-img"></div>
<h3>Player 2</h3>
<p>Search for a player</p>
</>
)}
</div>

</div>

<button 
className="compare-btn"
onClick={() => {

if(player1 && player2){
navigate("/compare", {
state: {
player1: player1,
player2: player2
}
});
} else {
alert("Please select both players first");
}

}}
>
Compare Players
</button>



</div>

{/*INFO SECTION */}
<div className="info-section">

<div className="info-card">
<h3>⚽ Player Comparison</h3>
<p>
Compare two Premier League players side by side and analyse their performance.
</p>
</div>

<div className="info-card">
<h3>📊 Real-Time Stats</h3>
<p>
Data is fetched live from a football API, ensuring accurate and up-to-date stats.
</p>
</div>

<div className="info-card">
<h3>🔍 Smart Search</h3>
<p>
Quickly find players using intelligent search suggestions and instant results.
</p>
</div>

</div>

</div>

);

}

export default LandingPage;