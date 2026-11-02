export const LEAGUE_ID = 39;
export const MIN_SEASON = 2016;
export const SEASON = 2024;
export function formatSeason(year) { return `${year}/${String(Number(year) + 1).slice(-2)}`; }
export const SEASON_LABEL = formatSeason(SEASON);
export function recordSeason(player) { return player?.selectionSeason ?? player?.statistics?.[0]?.league?.season ?? SEASON; }
export function recordLabel(player) { return `${player.player.name} · ${formatSeason(recordSeason(player))}`; }
export function seasonSummary(players) { return [...new Set(players.map((player) => formatSeason(recordSeason(player))))].join(" vs "); }
export function playerClub(player) { return [...new Set((player.statistics ?? []).map((stats) => stats.team?.name).filter(Boolean))].join(" / ") || "Club unavailable"; }

export function statNumber(value) {
  if (value == null || typeof value === "boolean" || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function percentage(part, total) {
  return part == null || total == null || total === 0
    ? null
    : Math.round((part / total) * 100);
}

export function playerMetrics(player) {
  const records = player?.statistics ?? [];
  const sum = (group, key) => {
    const numbers = records.map((stats) => statNumber(stats?.[group]?.[key]));
    return !numbers.length || numbers.some((value) => value == null) ? null : numbers.reduce((total, value) => total + value, 0);
  };
  const goals = sum("goals", "total");
  const assists = sum("goals", "assists");
  const shots = sum("shots", "total");
  const shotsOn = sum("shots", "on");
  return {
    goals,
    assists,
    shots,
    passes: sum("passes", "total"),
    tackles: sum("tackles", "total"),
    dribbles: sum("dribbles", "success"),
    shotAccuracy: percentage(shotsOn, shots),
    dribbleRate: percentage(sum("dribbles", "success"), sum("dribbles", "attempts")),
    contributions: goals == null || assists == null ? null : goals + assists,
  };
}

export function relativePair(first, second) {
  if (first == null || second == null) return [null, null];
  const highest = Math.max(first, second);
  return highest === 0 ? [0, 0] : [first / highest * 100, second / highest * 100];
}

export function formatStat(value, isPercent = false) {
  return value == null ? "N/A" : `${value}${isPercent ? "%" : ""}`;
}

// A seeded illustration, not match history. Always monotonic and ending at the real total.
export function simulatedTimeline(total, seed) {
  if (total == null) return Array(10).fill(null);
  let state = Array.from(String(seed)).reduce((hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0, 1);
  let previous = 0;
  return [0.05, 0.12, 0.22, 0.35, 0.46, 0.57, 0.68, 0.80, 0.92, 1].map((fraction, index) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const variation = (state / 4294967296 - 0.5) * 0.04;
    previous = index === 9 ? total : Math.max(previous, Math.min(total, Math.round(total * (fraction + variation))));
    return previous;
  });
}
