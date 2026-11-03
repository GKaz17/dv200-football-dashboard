import { LEAGUE_ID, SEASON, MIN_SEASON, formatSeason } from "./playerData";
import { cleanName, matchesPlayerName, nameHints, normalizeName, rankPlayers } from "./playerNames";

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
const lookupCache = new Map();
let batchFixtures = true;
export function canBatchFixtures() { return batchFixtures; }
export function clearFootballCache() { cache.clear(); lookupCache.clear(); batchFixtures = true; }

export async function footballRequest(endpoint, signal, ttl = 300000) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
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
      if (data.errors.search) throw new FootballApiError("The player service rejected that name. Try the player's full name without symbols.", "search");
      throw new FootballApiError("The player service could not complete this request. Please try again later.");
    }
    if (!Array.isArray(data?.response)) throw new FootballApiError("The player service returned an unexpected response. Please retry.");
    if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
    if (data.response.length) cache.set(endpoint, { data: data.response, expires: Date.now() + ttl,
      pages: Number.isInteger(data.paging?.total) && data.paging.total > 0 ? data.paging.total : 1 });
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
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const deadline = setTimeout(abort, 12000);
  try {
    if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
    const key = `${Number(season)}:${normalizeName(query)}`;
    const cached = lookupCache.get(key);
    if (process.env.REACT_APP_API_SPORTS_KEY && cached?.expires > Date.now()) return cached.data;
    const records = await resolvePlayers(query, controller.signal, season);
    if (records.length && !controller.signal.aborted) lookupCache.set(key, { data: records, expires: Date.now() + 300000 });
    return records;
  }
  catch (error) {
    if (controller.signal.aborted && !signal?.aborted) throw new FootballApiError("The player lookup timed out. Please retry.", "timeout");
    throw error;
  } finally { clearTimeout(deadline); signal?.removeEventListener("abort", abort); }
}

async function resolvePlayers(query, signal, season) {
  const text = cleanName(query);
  if (text.length < 3) throw new FootballApiError("Enter at least three letters of the player's name.", "search");
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const asSeason = (records) => records.map((item) => seasonRecord(item, season)).filter(Boolean);
  const byName = async (name) => asSeason(await footballRequest(`players?search=${encodeURIComponent(name)}&league=${LEAGUE_ID}&season=${season}`, signal));

  // The provider rejects three-character surnames and indexes abbreviated names unevenly.
  if (text.length >= 4) {
    const direct = await byName(text);
    if (direct.length) return rankPlayers(direct, query);
  }
  const surname = text.split(" ").at(-1);
  if (surname.length >= 4 && surname !== text) {
    const found = (await byName(surname)).filter(({ player }) => matchesPlayerName(player, query));
    if (found.length) return rankPlayers(found, query);
  }

  const hints = nameHints(query, season);
  const clubs = [...new Map(hints.map((hint) => [hint.club, hint])).values()];
  if (clubs.length > 3) throw new FootballApiError("Several players match that name. Enter a first and last name to narrow the search.", "search");
  if (!clubs.length) {
    if (text.length < 4) throw new FootballApiError("That short name is not in the local name directory. Try the player's full name.", "search");
    return [];
  }
  const teams = await footballRequest(`teams?league=${LEAGUE_ID}&season=${season}`, signal, 3600000);
  const clubAliases = { "man city": "manchester city", "man utd": "manchester united", "spurs": "tottenham",
    "nottm forest": "nottingham forest", "sheffield utd": "sheffield united" };
  const clubName = (name) => clubAliases[normalizeName(name)] ?? normalizeName(name);
  const ids = [...new Set(clubs.flatMap((hint) => teams.filter(({ team }) => team?.id &&
    (team.code === hint.clubCode || clubName(team.name) === clubName(hint.club))).map(({ team }) => team.id)))];
  const discovered = new Map();
  for (const team of ids) {
    let pages = 1;
    for (let page = 1; page <= Math.min(pages, 4); page++) {
      const endpoint = `players?team=${team}&league=${LEAGUE_ID}&season=${season}&page=${page}`;
      const roster = await footballRequest(endpoint, signal);
      pages = cache.get(endpoint)?.pages ?? 1;
      const matches = roster.filter(({ player }) => player?.id && matchesPlayerName(player, query));
      for (const record of matches) discovered.set(record.player.id, record);
      if (matches.length || !roster.length) break;
      if (page === 4 && pages > 4) throw new FootballApiError("The club lookup is incomplete. Try a more specific full name.", "search");
    }
  }
  if (discovered.size > 5) throw new FootballApiError("Several players match that name. Enter a first and last name to narrow the search.", "search");
  const results = [];
  for (const id of discovered.keys()) {
    // Club records only identify the player. Fetch by ID to retain every club after a transfer.
    const full = await footballRequest(`players?id=${id}&league=${LEAGUE_ID}&season=${season}`, signal);
    results.push(...asSeason(full).filter((record) => Number(record.player.id) === Number(id)));
  }
  return rankPlayers(results, query);
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
