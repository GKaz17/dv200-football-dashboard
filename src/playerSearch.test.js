import { searchPlayers } from "./playerSearch";

const originalKey = process.env.REACT_APP_API_SPORTS_KEY;
const originalFetch = global.fetch;
beforeEach(() => {
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
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("search=Salah&league=39&season=2024"), expect.objectContaining({ signal: controller.signal }));
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
  await expect(searchPlayers("Salah")).rejects.toThrow("could not complete");
});

test.each([null, {}, { response: {} }])("malformed payloads fail clearly", async (data) => {
  global.fetch.mockResolvedValue({ ok: true, json: async () => data });
  await expect(searchPlayers("Salah")).rejects.toThrow("unexpected response");
});
