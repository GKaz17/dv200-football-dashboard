import { LEAGUE_ID, SEASON, MIN_SEASON, formatSeason } from "./playerData";

export class FootballApiError extends Error {
  constructor(message, kind = "service", range = null) {
    super(message);
    this.kind = kind;
    this.range = range;
  }
}

export function planRange(errors) {
  const match = typeof errors?.plan === "string" && errors.plan.match(/from\s+(\d{4})\s+to\s+(\d{4})/i);
  return match ? { first: Number(match[1]), last: Number(match[2]) } : null;
}

const cache = new Map();
let batchFixtures = true;
export function canBatchFixtures() { return batchFixtures; }
export function clearFootballCache() { cache.clear(); batchFixtures = true; }

export async function footballRequest(endpoint, signal, ttl = 300000) {
  const key = process.env.REACT_APP_API_SPORTS_KEY;
  if (!key) throw new FootballApiError("Player search is not configured. Please try again after the API key is configured.");
  const cached = cache.get(endpoint);
  if (cached && cached.expires > Date.now()) return cached.data;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 12000);
  try {
    const response = await fetch(`https://v3.football.api-sports.io/${endpoint}`, {
      headers: { "x-apisports-key": key }, signal: controller.signal,
    });
    if (!response.ok) throw new FootballApiError(response.status === 429
      ? "The API request limit has been reached. Please wait and retry."
      : "The player service is unavailable. Please try again.", response.status === 429 ? "quota" : "service");
    const data = await response.json();
    if (data?.errors && Object.keys(data.errors).length) {
      const range = planRange(data.errors);
      if (endpoint.startsWith("fixtures?ids=") && /Ids parameter/i.test(data.errors.plan ?? "")) {
        batchFixtures = false;
        throw new FootballApiError("This plan requires single-fixture requests.", "batch");
      }
      if (data.errors.plan) throw new FootballApiError(range
        ? `Your API plan allows ${formatSeason(range.first)} to ${formatSeason(range.last)}. This season or endpoint is not included.`
        : "Your API plan does not include this season or endpoint.", "plan", range);
      if (data.errors.requests || data.errors.rateLimit) throw new FootballApiError("The API request limit has been reached. Please wait and retry.", "quota");
      throw new FootballApiError("The player service could not complete this request. Please try again later.");
    }
    if (!Array.isArray(data?.response)) throw new FootballApiError("The player service returned an unexpected response. Please retry.");
    if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
    if (data.response.length) cache.set(endpoint, { data: data.response, expires: Date.now() + ttl });
    return data.response;
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) throw new FootballApiError("The request timed out. Please retry.", "timeout");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export function seasonRecord(item, season) {
  if (!item?.player?.id || !item.player.name) return null;
  const statistics = (item.statistics ?? []).filter((stats) =>
    Number(stats.league?.id) === LEAGUE_ID && Number(stats.league?.season) === Number(season));
  return statistics.length ? { ...item, statistics, selectionSeason: Number(season) } : null;
}

export async function searchPlayers(query, signal, season = SEASON) {
  const records = await footballRequest(`players?search=${encodeURIComponent(query.trim())}&league=${LEAGUE_ID}&season=${season}`, signal);
  return records.map((item) => seasonRecord(item, season)).filter(Boolean);
}

export async function loadSeasonAvailability(signal) {
  const currentYear = new Date().getFullYear();
  let probeYear = currentYear;
  let verifiedCurrent = false;
  function planAvailability(error) {
    const first = Math.max(MIN_SEASON, error.range.first);
    const last = Math.min(currentYear, error.range.last);
    return {
      all: Array.from({ length: Math.max(0, last - first + 1) }, (_, index) => ({ year: last - index })),
      range: error.range,
      notice: `Your API plan allows ${formatSeason(error.range.first)} to ${formatSeason(error.range.last)}. Player coverage is checked when you search.`,
    };
  }

  // Access errors carry explicit year bounds even when the separate coverage service is slow.
  try {
    const records = await footballRequest(`players?league=${LEAGUE_ID}&season=${probeYear}&page=1`, signal, 3600000);
    verifiedCurrent = records.some((item) => seasonRecord(item, currentYear));
  }
  catch (error) {
    if (signal?.aborted || error.kind === "quota") throw error;
    if (error.kind === "plan" && error.range) return planAvailability(error);
  }

  let leagues;
  try { leagues = await footballRequest(`leagues?id=${LEAGUE_ID}`, signal, 3600000); }
  catch (error) {
    if (signal?.aborted || error.kind === "quota" || !verifiedCurrent) throw error;
    return { all: [{ year: currentYear }], range: null, notice: `${formatSeason(currentYear)} is accessible. Earlier-season coverage could not be refreshed.` };
  }
  const all = (leagues.find((item) => item.league?.id === LEAGUE_ID)?.seasons ?? [])
    .filter((item) => item.year >= MIN_SEASON && item.year <= currentYear && item.coverage?.players)
    .sort((a, b) => b.year - a.year);
  if (!all.length) throw new FootballApiError("No supported Premier League player seasons were returned. Please retry.");
  let notice = "";
  if (all[0].year !== probeYear) {
    probeYear = all[0].year;
    try { await footballRequest(`players?league=${LEAGUE_ID}&season=${probeYear}&page=1`, signal, 3600000); }
    catch (error) {
      if (signal?.aborted || error.kind === "quota") throw error;
      if (error.kind === "plan" && error.range) return planAvailability(error);
      notice = "Season coverage loaded. Access will be checked when you search.";
    }
  }
  return { all, range: null, notice };
}
