import { searchPlayers, clearFootballCache, loadSeasonAvailability, planRange, seasonRecord } from "./playerSearch";

const originalKey = process.env.REACT_APP_API_SPORTS_KEY;
const originalFetch = global.fetch;
beforeEach(() => {
  clearFootballCache();
  process.env.REACT_APP_API_SPORTS_KEY = "test-key";
  global.fetch = jest.fn();
});
afterEach(() => {
  if (originalKey == null) delete process.env.REACT_APP_API_SPORTS_KEY;
  else process.env.REACT_APP_API_SPORTS_KEY = originalKey;
  global.fetch = originalFetch;
});

test("uses the shared season and forwards the abort signal", async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ response: [], errors: [] }) });
  const controller = new AbortController();
  await expect(searchPlayers("  Salah  ", controller.signal)).resolves.toEqual([]);
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("search=Salah&league=39&season=2024"), expect.objectContaining({ signal: expect.any(AbortSignal) }));
});

test("missing configuration fails visibly instead of looking like no results", async () => {
  delete process.env.REACT_APP_API_SPORTS_KEY;
  await expect(searchPlayers("Salah")).rejects.toThrow("not configured");
  expect(global.fetch).not.toHaveBeenCalled();
});

test.each([429, 500])("HTTP %s becomes a retryable error", async (status) => {
    global.fetch.mockResolvedValue({ ok: false, status });
  await expect(searchPlayers("Salah")).rejects.toThrow(status === 429 ? /limit/ : /unavailable/);
});

test.each([{ errors: { requests: "provider detail" }, response: [] }, { errors: ["provider detail"], response: [] }])("API-level errors are not reported as an empty search", async (data) => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => data });
  await expect(searchPlayers("Salah")).rejects.toThrow(data.errors.requests ? "request limit" : "could not complete");
});

test.each([null, {}, { response: {} }])("malformed payloads fail clearly", async (data) => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => data });
  await expect(searchPlayers("Salah")).rejects.toThrow("unexpected response");
});

test("searches use each selected season and discard mismatched statistics", async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ response: [{ player: { id: 1, name: "Example" }, statistics: [
    { league: { id: 39, season: 2023 }, team: { id: 1 } },
    { league: { id: 39, season: 2024 }, team: { id: 2 } },
    { league: { id: 2, season: 2023 }, team: { id: 1 } },
  ] }], errors: [] }) });
  const rows = await searchPlayers("Example", undefined, 2023);
  expect(global.fetch.mock.calls[0][0]).toContain("season=2023");
  expect(rows[0].selectionSeason).toBe(2023);
  expect(rows[0].statistics).toHaveLength(1);
});

test("transfer records stay in the same requested league and season", () => {
  const item = { player: { id: 1, name: "Example" }, statistics: [
    { league: { id: 39, season: 2024 }, team: { id: 1 } },
    { league: { id: 39, season: 2024 }, team: { id: 2 } },
  ] };
  expect(seasonRecord(item, 2024).statistics).toHaveLength(2);
  expect(seasonRecord(item, 2023)).toBeNull();
});

test("explicit free-plan bounds are parsed without treating arbitrary errors as permissions", () => {
  expect(planRange({ plan: "Free plans do not have access to this season, try from 2022 to 2024." })).toEqual({ first: 2022, last: 2024 });
  expect(planRange({ plan: "Season not included." })).toBeNull();
  expect(planRange({ requests: "Try from 2022 to 2024" })).toBeNull();
});

test("season discovery respects coverage and the 2016 floor when the plan permits the current year", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ response: [], errors: [] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ response: [{ league: { id: 39 }, seasons: [
    { year: 2015, coverage: { players: true } }, { year: 2016, coverage: { players: true } },
    { year: 2022, coverage: { players: true } }, { year: 2024, coverage: { players: true } },
    { year: 2025, coverage: { players: false } }, { year: 2026, current: true, coverage: { players: true } },
  ] }], errors: [] }) });
  const result = await loadSeasonAvailability();
  expect(result.all.map((item) => item.year)).toEqual([2026, 2024, 2022, 2016]);
  expect(result.range).toBeNull();
});

test("explicit plan bounds keep accessible year choices available without a slow coverage lookup", async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ response: [], errors: { plan: "Try from 2022 to 2024." } }) });
  const result = await loadSeasonAvailability();
  expect(result.all.map((item) => item.year)).toEqual([2024, 2023, 2022]);
  expect(result.range).toEqual({ first: 2022, last: 2024 });
  expect(result.notice).toMatch(/coverage is checked when you search/);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test("a verified current season remains selectable if the older coverage service fails", async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ response: [{ player: { id: 1, name: "Example" }, statistics: [{ league: { id: 39, season: 2026 } }] }], errors: [] }) })
    .mockRejectedValueOnce(new TypeError("Coverage unavailable"));
  const result = await loadSeasonAvailability();
  expect(result.all.map((item) => item.year)).toEqual([2026]);
  expect(result.notice).toContain("2026/27 is accessible");
});

test("successful searches are cached by query and season, while failures remain retryable", async () => {
  global.fetch.mockImplementation(async (url) => ({ ok: true, json: async () => ({ response: [{ player: { id: 1, name: "Example" }, statistics: [
    { league: { id: 39, season: Number(new URL(url).searchParams.get("season")) } },
  ] }], errors: [] }) }));
  await searchPlayers("Example", undefined, 2023);
  await searchPlayers("Example", undefined, 2023);
  await searchPlayers("Example", undefined, 2024);
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

const apiResponse = (records, pages = 1) => ({ ok: true, json: async () => ({ response: records, errors: [], paging: { total: pages } }) });
const ezeRecord = (year, extra = []) => ({
  player: { id: 19586, name: "E. Eze", firstname: "Eberechi Oluchi", lastname: "Eze" },
  statistics: [{ league: { id: 39, season: year }, team: { id: 52, name: "Crystal Palace" }, goals: { total: 8 } }, ...extra],
});
function mockEze({ rosterPage = 1, hydrated = null } = {}) {
  global.fetch.mockImplementation(async (address) => {
    const url = new URL(address), params = url.searchParams, year = Number(params.get("season"));
    if (url.pathname === "/teams") return apiResponse([{ team: { id: 52, name: "Crystal Palace", code: "CRY" } }]);
    if (params.has("id")) return apiResponse(hydrated ?? [ezeRecord(year)]);
    if (params.has("team")) return Number(params.get("page")) === rosterPage ? apiResponse([ezeRecord(year)], rosterPage)
      : apiResponse([{ player: { id: 1, name: "Other Player" }, statistics: [] }], rosterPage);
    return apiResponse([]);
  });
}

test.each(["Eze", "Eberechi", "Eberechi Eze", "E. Eze"])("resolves %s to live ID-based statistics without an invalid short-surname request", async (query) => {
  mockEze();
  const records = await searchPlayers(query);
  expect(records).toHaveLength(1);
  expect(records[0]).toMatchObject({ player: { id: 19586, name: "E. Eze" }, selectionSeason: 2024 });
  const urls = global.fetch.mock.calls.map(([url]) => new URL(url));
  expect(urls.some((url) => url.searchParams.get("id") === "19586")).toBe(true);
  for (const url of urls.filter((url) => url.searchParams.has("search"))) {
    expect(url.searchParams.get("search").length).toBeGreaterThanOrEqual(4);
    expect(url.searchParams.get("search")).not.toMatch(/[.']/);
  }
});

test("club discovery follows pagination and always fetches the complete selected-season record by ID", async () => {
  const extra = { league: { id: 39, season: 2024 }, team: { id: 42 }, goals: { total: 2 } };
  mockEze({ rosterPage: 2, hydrated: [ezeRecord(2024, [extra])] });
  const records = await searchPlayers("Eze");
  expect(global.fetch.mock.calls.some(([url]) => new URL(url).searchParams.get("page") === "2")).toBe(true);
  expect(records[0].statistics).toHaveLength(2);
});

test("name-directory records cannot fabricate missing API statistics", async () => {
  mockEze({ hydrated: [] });
  await expect(searchPlayers("Eze")).resolves.toEqual([]);
});

test("ID hydration rejects mismatched season and league", async () => {
  mockEze({ hydrated: [ezeRecord(2023)] });
  await expect(searchPlayers("Eze", undefined, 2024)).resolves.toEqual([]);
});

test("fallback records and club hints are cached independently by requested season", async () => {
  mockEze();
  await searchPlayers("Eze", undefined, 2024);
  const calls = global.fetch.mock.calls.length;
  await searchPlayers("Eze", undefined, 2024);
  expect(global.fetch).toHaveBeenCalledTimes(calls);
  await searchPlayers("Eze", undefined, 2023);
  expect(global.fetch.mock.calls.slice(calls).every(([url]) => new URL(url).searchParams.get("season") === "2023")).toBe(true);
});

test("full-name search can fall back to a searchable surname outside the bundled directory", async () => {
  global.fetch.mockImplementation(async (address) => apiResponse(new URL(address).searchParams.get("search") === "Example" ? [
    { player: { id: 1, name: "J. Example", firstname: "Jane", lastname: "Example" }, statistics: [{ league: { id: 39, season: 2016 } }] },
    { player: { id: 2, name: "J. Example", firstname: "John", lastname: "Example" }, statistics: [{ league: { id: 39, season: 2016 } }] },
  ] : []));
  const rows = await searchPlayers("Jane Example", undefined, 2016);
  expect(rows.map((record) => record.player.id)).toEqual([1]);
});

test("ambiguous first names request a more specific name before scanning clubs", async () => {
  global.fetch.mockResolvedValue(apiResponse([]));
  await expect(searchPlayers("Alex")).rejects.toThrow("first and last name");
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test("unknown short names fail with guidance rather than sending invalid provider requests", async () => {
  await expect(searchPlayers("Zzx")).rejects.toThrow("full name");
  expect(global.fetch).not.toHaveBeenCalled();
});

test("a quota failure is not hidden by a fallback request", async () => {
  global.fetch.mockResolvedValue({ ok: false, status: 429 });
  await expect(searchPlayers("Eberechi")).rejects.toThrow("limit");
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test("cancelled searches do not start discovery or read cached data", async () => {
  mockEze();
  await searchPlayers("Eze");
  const calls = global.fetch.mock.calls.length;
  const controller = new AbortController();
  controller.abort();
  await expect(searchPlayers("Eze", controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  expect(global.fetch).toHaveBeenCalledTimes(calls);
});

test("a multi-step lookup has one overall timeout, not a fresh wait for each discovery step", async () => {
  jest.useFakeTimers();
  global.fetch.mockImplementation((url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  }));
  const pending = searchPlayers("Eze");
  const assertion = expect(pending).rejects.toMatchObject({ kind: "timeout" });
  jest.advanceTimersByTime(12000);
  await assertion;
  jest.useRealTimers();
});

test.each(["Odegaard", "\u00d8degaard", "Martin Odegaard", "Martin \u00d8degaard"])(
  "%s resolves through directory and ID lookup without altering the provider's displayed name", async (query) => {
    const record = { player: { id: 37127, name: "M. \u00d8degaard", firstname: "Martin", lastname: "\u00d8degaard" },
      statistics: [{ league: { id: 39, season: 2024 }, team: { id: 42, name: "Arsenal" }, goals: { total: 3, assists: 8 } }] };
    global.fetch.mockImplementation(async (address) => {
      const url = new URL(address);
      if (url.pathname === "/teams") return apiResponse([{ team: { id: 42, name: "Arsenal", code: "ARS" } }]);
      return apiResponse(url.searchParams.has("team") || url.searchParams.has("id") ? [record] : []);
    });
    const rows = await searchPlayers(query);
    expect(rows).toHaveLength(1);
    expect(rows[0].player.name).toBe("M. \u00d8degaard");
    expect(rows[0].player.id).toBe(37127);
    const queries = global.fetch.mock.calls.map(([url]) => new URL(url).searchParams.get("search")).filter(Boolean);
    expect(queries.length).toBeGreaterThan(0);
    expect(queries.every((name) => /^[a-z0-9 ]+$/i.test(name) && /Odegaard/.test(name))).toBe(true);
  },
);

test("equivalent accent spellings reuse a successful lookup but do not leak across seasons", async () => {
  const record = (year) => ({ player: { id: 37127, name: "M. \u00d8degaard", firstname: "Martin", lastname: "\u00d8degaard" },
    statistics: [{ league: { id: 39, season: year }, team: { id: 42 } }] });
  global.fetch.mockImplementation(async (address) => {
    const url = new URL(address), year = Number(url.searchParams.get("season"));
    if (url.pathname === "/teams") return apiResponse([{ team: { id: 42, name: "Arsenal", code: "ARS" } }]);
    return apiResponse(url.searchParams.has("team") || url.searchParams.has("id") ? [record(year)] : []);
  });
  await searchPlayers("Odegaard", undefined, 2024);
  const calls = global.fetch.mock.calls.length;
  await searchPlayers("\u00d8degaard", undefined, 2024);
  expect(global.fetch).toHaveBeenCalledTimes(calls);
  await searchPlayers("\u00d8degaard", undefined, 2023);
  expect(global.fetch.mock.calls.length).toBeGreaterThan(calls);
  clearFootballCache();
  await searchPlayers("Odegaard", undefined, 2024);
  expect(global.fetch.mock.calls.length).toBeGreaterThan(calls + 1);
});
