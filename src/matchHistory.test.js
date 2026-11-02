import { matchweekHistory, loadMatchHistory, historyRequestEstimate } from "./matchHistory";
import { clearFootballCache, canBatchFixtures } from "./playerSearch";
import { playerMetrics } from "./playerData";

const player = { player: { id: 1, name: "Example" }, selectionSeason: 2024, statistics: [{ team: { id: 10 } }] };
const metricRecord = (goals) => ({ goals: { total: goals, assists: 0 }, shots: { total: 2 }, passes: { total: 8 }, tackles: { total: 1 } });
const fixture = (id, week, records) => ({ fixture: { id, status: { short: "FT" } }, league: { round: `Regular Season - ${week}` },
  players: [{ team: { id: 10 }, players: records }] });
const originalFetch = global.fetch;
const originalKey = process.env.REACT_APP_API_SPORTS_KEY;
beforeEach(() => { clearFootballCache(); process.env.REACT_APP_API_SPORTS_KEY = "test-key"; global.fetch = jest.fn(); });
afterEach(() => { global.fetch = originalFetch; if (originalKey == null) delete process.env.REACT_APP_API_SPORTS_KEY; else process.env.REACT_APP_API_SPORTS_KEY = originalKey; });

test("recorded weeks retain real zero, nonappearance, missing coverage and future gaps", () => {
  const rows = matchweekHistory([
    fixture(1, 1, [{ player: { id: 1 }, statistics: [metricRecord(2)] }]),
    fixture(2, 2, [{ player: { id: 2 }, statistics: [metricRecord(1)] }]),
    fixture(3, 3, []),
    fixture(4, 4, [{ player: { id: 1 }, statistics: [metricRecord(0)] }]),
  ], player);
  expect(rows.map((week) => week.goals).slice(0, 5)).toEqual([2, 0, null, 0, null]);
  expect(rows).toHaveLength(38);
});

test("transfer totals aggregate count fields but preserve any unavailable fields", () => {
  const stats = playerMetrics({ statistics: [metricRecord(3), { ...metricRecord(4), tackles: { total: null } }] });
  expect(stats.goals).toBe(7);
  expect(stats.passes).toBe(16);
  expect(stats.tackles).toBeNull();
});

test("history cost estimates deduplicate identical player-season records", () => {
  expect(historyRequestEstimate([player, player])).toBe(8);
  expect(historyRequestEstimate([player, { ...player, selectionSeason: 2023 }])).toBe(16);
});

test("quota errors stop history loading instead of faking zero points", async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ response: [], errors: { requests: "Quota exceeded" } }) });
  await expect(loadMatchHistory(player)).rejects.toMatchObject({ kind: "quota" });
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test("missing team identity does not spend API calls", async () => {
  await expect(loadMatchHistory({ ...player, statistics: [] })).rejects.toThrow("no team ID");
  expect(global.fetch).not.toHaveBeenCalled();
});

test("fixture listings from another league or season cannot contaminate an overlay", async () => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => ({ response: [
    { ...fixture(1, 1, []), league: { id: 39, season: 2023, round: "Regular Season - 1" } },
    { ...fixture(2, 1, []), league: { id: 2, season: 2024, round: "Regular Season - 1" } },
  ], errors: [] }) });
  await expect(loadMatchHistory(player)).rejects.toThrow("No completed Premier League fixtures");
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test("free-plan batching restrictions use cached single-fixture details within the selected window", async () => {
  const row = (id, week) => ({ ...fixture(id, week, [{ player: { id: 1 }, statistics: [metricRecord(week)] }]), league: { id: 39, season: 2024, round: `Regular Season - ${week}` } });
  global.fetch.mockImplementation(async (url) => {
    const query = new URL(url).searchParams;
    const errors = query.has("ids") ? { plan: "Free plans do not have access to the Ids parameter." } : [];
    const rows = query.has("id") ? [row(Number(query.get("id")), Number(query.get("id")))] : [row(1, 1), row(2, 2), row(8, 8)];
    return { ok: true, json: async () => ({ response: rows, errors }) };
  });
  const result = await loadMatchHistory(player, undefined, undefined, { firstWeek: 1, lastWeek: 2 });
  expect(result.slice(0, 3).map((week) => week.goals)).toEqual([1, 2, null]);
  expect(canBatchFixtures()).toBe(false);
  expect(global.fetch).toHaveBeenCalledTimes(4);
  expect(global.fetch.mock.calls.some(([url]) => url.includes("id=8"))).toBe(false);
  await loadMatchHistory(player, undefined, undefined, { firstWeek: 1, lastWeek: 2 });
  expect(global.fetch).toHaveBeenCalledTimes(4);
});

test("invalid matchweek windows fail without spending quota", async () => {
  await expect(loadMatchHistory(player, undefined, undefined, { firstWeek: 10, lastWeek: 2 })).rejects.toThrow("valid matchweek window");
  expect(global.fetch).not.toHaveBeenCalled();
});
