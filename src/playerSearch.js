import { LEAGUE_ID, SEASON } from "./playerData";

export async function searchPlayers(query, signal) {
  const key = process.env.REACT_APP_API_SPORTS_KEY;
  if (!key) throw new Error("Player search is not configured. Please try again after the API key is configured.");

  const response = await fetch(
    `https://v3.football.api-sports.io/players?search=${encodeURIComponent(query.trim())}&league=${LEAGUE_ID}&season=${SEASON}`,
    { headers: { "x-apisports-key": key }, signal }
  );
  if (!response.ok) {
    throw new Error(response.status === 429
      ? "The search limit has been reached. Please wait a moment and retry."
      : "The player service is unavailable. Please try again.");
  }
  const data = await response.json();
  if (data?.errors && Object.keys(data.errors).length > 0) {
    throw new Error("The player service could not complete this search. Please try again later.");
  }
  if (!Array.isArray(data?.response)) throw new Error("The player service returned an unexpected response. Please retry.");
  return data.response.filter((item) => item?.player?.id != null && item.player.name);
}
