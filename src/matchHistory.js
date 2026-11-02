import { footballRequest, FootballApiError, canBatchFixtures } from "./playerSearch";
import { LEAGUE_ID, playerMetrics, recordSeason } from "./playerData";

const METRICS = ["goals", "assists", "shots", "passes", "tackles"];
const FINISHED = new Set(["FT", "AET", "PEN"]);

export function matchweekHistory(fixtures, player) {
  const teams = new Set((player.statistics ?? []).map((stats) => stats.team?.id));
  const weeks = new Map();
  for (const fixture of fixtures) {
    if (!FINISHED.has(fixture.fixture?.status?.short)) continue;
    const round = fixture.league?.round?.match(/(?:^|\D)(\d+)$/);
    const week = round ? Number(round[1]) : 0;
    if (week < 1 || week > 38) continue;
    const groups = (fixture.players ?? []).filter((team) => teams.has(team.team?.id));
    const athlete = groups.flatMap((team) => team.players ?? []).find((item) => item.player?.id === player.player.id);
    const expectedTeams = [fixture.teams?.home?.id, fixture.teams?.away?.id].filter((id) => teams.has(id));
    const knownAbsence = groups.length > 0 && groups.every((team) => Array.isArray(team.players) && team.players.length > 0)
      && expectedTeams.every((id) => groups.some((team) => team.team?.id === id));
    const metrics = athlete ? playerMetrics(athlete) : Object.fromEntries(METRICS.map((key) => [key, knownAbsence ? 0 : null]));
    weeks.set(week, [...(weeks.get(week) ?? []), metrics]);
  }
  return Array.from({ length: 38 }, (_, index) => {
    const records = weeks.get(index + 1) ?? [];
    return Object.fromEntries(METRICS.map((key) => [key,
      !records.length || records.some((stats) => stats[key] == null) ? null : records.reduce((sum, stats) => sum + stats[key], 0)]));
  });
}

export function historyRequestEstimate(players, firstWeek = 1, lastWeek = 6) {
  const unique = [...new Map(players.map((player) => [`${player.player.id}:${recordSeason(player)}`, player])).values()];
  return unique.reduce((total, player) => {
    const teams = new Set(player.statistics.map((stats) => stats.team?.id).filter(Boolean)).size;
    return total + teams + teams * (lastWeek - firstWeek + 1) + (canBatchFixtures() ? 1 : 0);
  }, 0);
}

export async function loadMatchHistory(player, signal, progress = () => {}, { firstWeek = 1, lastWeek = 6 } = {}) {
  if (!Number.isInteger(firstWeek) || !Number.isInteger(lastWeek) || firstWeek < 1 || lastWeek > 38 || firstWeek > lastWeek) {
    throw new FootballApiError("Choose a valid matchweek window between 1 and 38.");
  }
  const season = recordSeason(player);
  const teams = [...new Set(player.statistics.map((stats) => stats.team?.id).filter(Boolean))];
  if (!teams.length) throw new FootballApiError("This player record has no team ID for loading match history.");
  const fixtures = new Map();
  for (const team of teams) {
    const rows = await footballRequest(`fixtures?league=${LEAGUE_ID}&season=${season}&team=${team}&status=FT-AET-PEN`, signal, 3600000);
    rows.forEach((row) => {
      const week = Number(row.league?.round?.match(/(?:^|\D)(\d+)$/)?.[1]);
      if (Number(row.league?.id) === LEAGUE_ID && Number(row.league?.season) === Number(season)
        && week >= firstWeek && week <= lastWeek
        && FINISHED.has(row.fixture?.status?.short) && row.fixture?.id) fixtures.set(row.fixture.id, row);
    });
    progress();
  }
  if (!fixtures.size) throw new FootballApiError("No completed Premier League fixtures are available in this matchweek window.");
  const ids = [...fixtures.keys()];
  if (ids.length > teams.length * 40) throw new FootballApiError("The fixture response was unexpectedly large. Loading stopped to protect your quota.");
  const detailed = new Set();
  function applyDetails(rows) {
    rows.forEach((row) => {
      if (Number(row.league?.id) === LEAGUE_ID && Number(row.league?.season) === Number(season)
        && fixtures.has(row.fixture?.id)) { fixtures.set(row.fixture.id, row); detailed.add(row.fixture.id); }
    });
  }
  if (canBatchFixtures()) {
    for (let offset = 0; offset < ids.length; offset += 20) {
      try {
        applyDetails(await footballRequest(`fixtures?ids=${ids.slice(offset, offset + 20).join("-")}`, signal, 3600000));
        progress();
      } catch (error) {
        if (error.kind !== "batch") throw error;
        progress();
        break;
      }
    }
  }
  if (!canBatchFixtures()) {
    for (const id of ids.filter((id) => !detailed.has(id))) {
      applyDetails(await footballRequest(`fixtures?id=${id}`, signal, 3600000));
      progress();
    }
  }
  return matchweekHistory([...fixtures.values()], player);
}
