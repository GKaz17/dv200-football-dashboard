import { LEAGUE_ID, MIN_SEASON, SEASON, statNumber } from "./playerData";

export const SELECTION_KEY = "pitchstats.selection.v1";
const MAX_AGE = 24 * 60 * 60 * 1000;
const validYear = (year) => Number.isInteger(year) && year >= MIN_SEASON && year <= new Date().getFullYear();
const text = (value, limit = 120) => typeof value === "string" ? value.slice(0, limit) : "";
const imageUrl = (value) => typeof value === "string" && (/^https?:\/\//.test(value) || value.startsWith("/")) ? value : undefined;

export function emptySelection() {
  return { player1: null, player2: null, season1: SEASON, season2: SEASON, query1: "", query2: "" };
}

function storedPlayer(record, season) {
  const selectedAt = record?.selectedAt;
  if (!Number.isSafeInteger(record?.player?.id) || record.player.id < 1 || !text(record.player.name) ||
    !Number.isFinite(selectedAt) || selectedAt > Date.now() + 60000 || Date.now() - selectedAt > MAX_AGE ||
    !Array.isArray(record.statistics) || record.selectionSeason !== season) return null;
  const statistics = record.statistics.filter((stats) => stats?.league?.id === LEAGUE_ID && stats.league.season === season)
    .map((stats) => ({
      league: { id: LEAGUE_ID, season },
      team: { id: stats.team?.id, name: text(stats.team?.name), logo: imageUrl(stats.team?.logo) },
      games: { position: text(stats.games?.position) },
      goals: { total: statNumber(stats.goals?.total), assists: statNumber(stats.goals?.assists) },
      shots: { total: statNumber(stats.shots?.total), on: statNumber(stats.shots?.on) },
      passes: { total: statNumber(stats.passes?.total) },
      tackles: { total: statNumber(stats.tackles?.total) },
      dribbles: { attempts: statNumber(stats.dribbles?.attempts), success: statNumber(stats.dribbles?.success) },
    }));
  if (!statistics.length) return null;
  return {
    player: { id: record.player.id, name: text(record.player.name), photo: imageUrl(record.player.photo) },
    statistics, selectionSeason: season, selectedAt,
  };
}

function cleanSelection(input) {
  const selection = emptySelection();
  for (const slot of [1, 2]) {
    const season = input?.[`season${slot}`];
    if (validYear(season)) selection[`season${slot}`] = season;
    const player = storedPlayer(input?.[`player${slot}`], selection[`season${slot}`]);
    const query = text(input?.[`query${slot}`] ?? player?.player.name);
    selection[`query${slot}`] = query;
    selection[`player${slot}`] = player && query === player.player.name ? player : null;
  }
  return selection;
}

export function readSelection(storage) {
  try {
    const raw = (storage ?? window.localStorage).getItem(SELECTION_KEY);
    if (!raw || raw.length > 524288) return emptySelection();
    const parsed = JSON.parse(raw);
    return parsed.version === 1 ? cleanSelection(parsed.selection) : emptySelection();
  } catch { return emptySelection(); }
}

export function saveSelection(selection, storage) {
  try {
    (storage ?? window.localStorage).setItem(SELECTION_KEY, JSON.stringify({ version: 1, selection: cleanSelection(selection) }));
    return true;
  } catch { return false; }
}

export function clearSavedSelection(storage) {
  try { (storage ?? window.localStorage).removeItem(SELECTION_KEY); } catch {}
}

