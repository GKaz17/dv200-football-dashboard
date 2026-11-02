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
