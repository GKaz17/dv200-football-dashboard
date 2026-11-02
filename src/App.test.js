import { act, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import App from "./App";
import ComparePage from "./pages/ComparePage";
import { MemoryRouter } from "react-router-dom";
import { clearFootballCache, loadSeasonAvailability } from "./playerSearch";
import TimelinePage from "./pages/TimelinePage";
import * as matchHistory from "./matchHistory";
import { saveSelection, SELECTION_KEY } from "./selectionStorage";

jest.mock("./playerSearch", () => ({ ...jest.requireActual("./playerSearch"), loadSeasonAvailability: jest.fn() }));

jest.mock("react-chartjs-2", () => ({
  Radar: ({ data }) => <div data-testid="radar" data-chart={JSON.stringify(data)} />,
  Bar: ({ data }) => <div data-testid="bar" data-chart={JSON.stringify(data)} />,
  Pie: ({ data }) => <div data-testid="pie" data-chart={JSON.stringify(data)} />,
  Line: ({ data }) => <div data-testid="line" data-chart={JSON.stringify(data)} />,
}));

const player = (id, name, assists = 2) => ({
  player: { id, name, photo: "/Logo_PitchStats.png" },
  statistics: [{ league: { id: 39, season: 2024 }, team: { id: 10, name: "Test Club" }, games: { position: "Attacker" },
    goals: { total: id === 1 ? 10 : 0, assists }, shots: { total: 20, on: 0 },
    passes: { total: 100 }, tackles: { total: null }, dribbles: { attempts: 10, success: 4 } }],
});
const first = player(1, "Player One");
const second = player(2, "Player Two", null);
const response = (records) => ({ ok: true, json: async () => ({ response: records, errors: [] }) });
const chart = (name) => JSON.parse(screen.getByTestId(name).getAttribute("data-chart"));
const originalKey = process.env.REACT_APP_API_SPORTS_KEY;
const originalFetch = global.fetch;

beforeEach(() => {
  window.localStorage.clear();
  clearFootballCache();
  loadSeasonAvailability.mockResolvedValue({ all: [{ year: 2024, coverage: { fixtures: { statistics_players: true } } }], range: null, notice: "" });
  window.history.replaceState({}, "", "/");
  process.env.REACT_APP_API_SPORTS_KEY = "test-key";
  global.fetch = jest.fn().mockResolvedValue(response([first]));
});
afterEach(() => {
  jest.restoreAllMocks();
  if (originalKey == null) delete process.env.REACT_APP_API_SPORTS_KEY;
  else process.env.REACT_APP_API_SPORTS_KEY = originalKey;
  global.fetch = originalFetch;
  jest.useRealTimers();
});

function search(label, query) {
  const panel = within(screen.getByRole("group", { name: label }));
  fireEvent.change(panel.getByRole("textbox"), { target: { value: query } });
  fireEvent.click(panel.getByRole("button", { name: `Search ${label}` }));
  return panel;
}

async function selectPair() {
  global.fetch.mockResolvedValueOnce(response([first])).mockResolvedValueOnce(response([second]));
  search("Player A", "One");
  await screen.findByRole("heading", { name: "Player One" });
  search("Player B", "Two");
  await screen.findByRole("heading", { name: "Player Two" });
}

test("season/source copy is accurate and branding has no placeholder contact or dead actions", async () => {
  render(<App />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("BY SEASON");
  await waitFor(() => expect(screen.getByRole("button", { name: "Refresh seasons" })).toBeEnabled());
  expect(screen.getByText("DATA FROM API-SPORTS")).toBeInTheDocument();
  expect(screen.queryByText(/OPTA|heatmap|xG|Export Insights|support@|PL Compare/i)).not.toBeInTheDocument();
  expect(document.querySelector(".nav-actions")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "GitHub repository" })).toHaveAttribute("href", "https://github.com/GKaz17/dv200-football-dashboard");
});

test("player chart colours stay consistent between comparison and timeline", () => {
  const comparison = render(<MemoryRouter><ComparePage player1={first} player2={second} /></MemoryRouter>);
  const colours = chart("bar").datasets.map((dataset) => dataset.borderColor);
  expect(colours[0]).not.toBe(colours[1]);
  expect(chart("radar").datasets.map((dataset) => dataset.borderColor)).toEqual(colours);
  comparison.unmount();
  render(<MemoryRouter><TimelinePage player1={first} player2={second} /></MemoryRouter>);
  expect(chart("line").datasets.map((dataset) => dataset.borderColor)).toEqual(colours);
  expect(chart("line").datasets[1].borderDash).not.toEqual([]);
});

test("independent seasons support the same player across years and clear stale selections", async () => {
  loadSeasonAvailability.mockResolvedValue({ all: [{ year: 2026 }, { year: 2024 }, { year: 2016 }], range: null, notice: "" });
  global.fetch.mockImplementation(async (url) => {
    const year = Number(new URL(url).searchParams.get("season"));
    const record = player(1, "Player One");
    record.statistics[0].league.season = year;
    record.statistics[0].goals.total = year === 2016 ? 11 : 18;
    return response([record]);
  });
  render(<App />);
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Player A season" })).toHaveValue("2026"));
  fireEvent.change(screen.getByRole("combobox", { name: "Player A season" }), { target: { value: "2016" } });
  search("Player A", "One");
  await within(screen.getByRole("group", { name: "Player A" })).findByRole("heading", { name: "Player One" });
  search("Player B", "One");
  await within(screen.getByRole("group", { name: "Player B" })).findByRole("heading", { name: "Player One" });
  fireEvent.click(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("link", { name: "COMPARE" }));
  expect(chart("bar").datasets.map((item) => item.label)).toEqual(["Player One · 2016/17", "Player One · 2026/27"]);
  expect(chart("bar").datasets.map((item) => item.data[0])).toEqual([11, 18]);
  fireEvent.click(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("link", { name: "HOME" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Player A season" }), { target: { value: "2024" } });
  expect(within(screen.getByRole("group", { name: "Player A" })).queryByRole("heading")).not.toBeInTheDocument();
  expect(within(screen.getByRole("group", { name: "Player B" })).getByRole("heading")).toHaveTextContent("Player One");
});

test("the API's explicit plan range removes locked seasons from the selectors", async () => {
  loadSeasonAvailability.mockResolvedValue({ all: [{ year: 2026 }, { year: 2024 }, { year: 2023 }, { year: 2022 }, { year: 2016 }], range: { first: 2022, last: 2024 }, notice: "Your API plan allows 2022/23 to 2024/25." });
  render(<App />);
  await screen.findByText(/Your API plan allows/);
  expect([...screen.getByRole("combobox", { name: "Player A season" }).options].map((option) => option.value)).toEqual(["2024", "2023", "2022"]);
});

test("changing season cancels an in-flight search and rejects the old-season response", async () => {
  loadSeasonAvailability.mockResolvedValue({ all: [{ year: 2024 }, { year: 2023 }], range: null, notice: "" });
  let resolveOld;
  global.fetch.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }));
  render(<App />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Refresh seasons" })).toBeEnabled());
  search("Player A", "One");
  fireEvent.change(screen.getByRole("combobox", { name: "Player A season" }), { target: { value: "2023" } });
  await act(async () => resolveOld(response([first])));
  expect(screen.queryByRole("heading", { name: "Player One" })).not.toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Player A" })).toHaveValue("");
});

test("no intersection between coverage and plan gives a disabled search instead of a false season", async () => {
  loadSeasonAvailability.mockResolvedValue({ all: [{ year: 2026 }], range: { first: 2022, last: 2024 }, notice: "Restricted plan." });
  render(<App />);
  await screen.findByText(/No covered player seasons are accessible/);
  expect(screen.getByRole("textbox", { name: "Player A" })).toBeDisabled();
  expect(screen.getByRole("combobox", { name: "Player A season" })).toBeDisabled();
});

test("recorded matchweek overlays load once, reuse fixtures and retain gaps", async () => {
  render(<App />);
  await selectPair();
  fireEvent.click(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("link", { name: "TIMELINE" }));
  const fixture = (id, week, details = false) => ({
    fixture: { id, status: { short: "FT" } }, league: { id: 39, season: 2024, round: `Regular Season - ${week}` },
    ...(details ? { players: [{ team: { id: 10 }, players: [
      { player: first.player, statistics: [{ goals: { total: week, assists: 0 }, shots: { total: 3 }, passes: { total: 10 }, tackles: { total: 1 } }] },
      { player: second.player, statistics: [{ goals: { total: 0, assists: 0 }, shots: { total: 2 }, passes: { total: 5 }, tackles: { total: 0 } }] },
    ] }] } : {}),
  });
  global.fetch.mockClear();
  global.fetch.mockImplementation(async (url) => response([fixture(101, 1, url.includes("ids=")), fixture(102, 2, url.includes("ids="))]));
  fireEvent.click(screen.getByLabelText("Recorded matchweeks"));
  expect(screen.queryByTestId("line")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Load match history" }));
  await screen.findByTestId("line");
  expect(chart("line").datasets[0].data.slice(0, 3)).toEqual([1, 2, null]);
  expect(chart("line").datasets[1].data.slice(0, 3)).toEqual([0, 0, null]);
  expect(global.fetch).toHaveBeenCalledTimes(2);
  fireEvent.change(screen.getByLabelText("Metric:"), { target: { value: "passes" } });
  expect(chart("line").datasets[0].data.slice(0, 2)).toEqual([10, 10]);
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test("large history loads require explicit quota approval and invalid windows cannot load", async () => {
  render(<App />);
  await selectPair();
  fireEvent.click(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("link", { name: "TIMELINE" }));
  fireEvent.click(screen.getByLabelText("Recorded matchweeks"));
  fireEvent.change(screen.getByLabelText("To matchweek"), { target: { value: "38" } });
  expect(screen.getByRole("button", { name: "Load match history" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: /Allow up to 80 requests/ }));
  expect(screen.getByRole("button", { name: "Load match history" })).toBeEnabled();
  fireEvent.change(screen.getByLabelText("From matchweek"), { target: { value: "39" } });
  expect(screen.getByRole("alert")).toHaveTextContent("Choose a matchweek window");
  expect(screen.getByRole("button", { name: "Load match history" })).toBeDisabled();
});

test("an unavailable recorded series is named explicitly and is not replaced with zero", async () => {
  jest.spyOn(matchHistory, "loadMatchHistory")
    .mockResolvedValueOnce(Array.from({ length: 38 }, () => ({ goals: null })))
    .mockResolvedValueOnce(Array.from({ length: 38 }, () => ({ goals: 0 })));
  render(<MemoryRouter><TimelinePage player1={first} player2={second} /></MemoryRouter>);
  fireEvent.click(screen.getByLabelText("Recorded matchweeks"));
  fireEvent.click(screen.getByRole("button", { name: "Load match history" }));
  expect(await screen.findByText(/No recorded goals values.*Player One/)).toHaveTextContent("These gaps are not zero.");
  expect(chart("line").datasets[0].data).toEqual(Array(6).fill(null));
  expect(chart("line").datasets[1].data).toEqual(Array(6).fill(0));
});

test("navbar comparison resolves both typed names without requiring the lower compare button", async () => {
  global.fetch.mockImplementation(async (url) => response(new URL(url).searchParams.get("search") === "One" ? [first] : [second]));
  render(<App />);
  fireEvent.change(screen.getByRole("textbox", { name: "Player A" }), { target: { value: "One" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Player B" }), { target: { value: "Two" } });
  fireEvent.click(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("link", { name: "COMPARE" }));
  await screen.findByRole("heading", { name: "Player Comparison" });
  expect(chart("bar").datasets.map((item) => item.label)).toEqual(["Player One · 2024/25", "Player Two · 2024/25"]);
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("link", { name: "COMPARE" })).toHaveAttribute("aria-current", "page");
});

test("a failed navbar lookup retains both drafts and the successfully resolved player", async () => {
  global.fetch.mockResolvedValueOnce(response([first])).mockResolvedValueOnce(response([]));
  render(<App />);
  fireEvent.change(screen.getByRole("textbox", { name: "Player A" }), { target: { value: "One" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Player B" }), { target: { value: "Two" } });
  fireEvent.click(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("link", { name: "TIMELINE" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No Player B match");
  expect(screen.getByRole("heading", { name: "Player One" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Player B" })).toHaveValue("Two");
  expect(window.location.pathname).toBe("/");
  expect(JSON.parse(window.localStorage.getItem(SELECTION_KEY)).selection.query2).toBe("Two");
});

test("saved cross-season records survive remounts and direct timeline routes without a new lookup", () => {
  const earlier = { ...first, selectionSeason: 2023, selectedAt: Date.now(), statistics: first.statistics.map((stats) => ({ ...stats, league: { id: 39, season: 2023 } })) };
  const later = { ...second, selectionSeason: 2024, selectedAt: Date.now() };
  saveSelection({ player1: earlier, player2: later, season1: 2023, season2: 2024, query1: earlier.player.name, query2: later.player.name });
  loadSeasonAvailability.mockImplementation(() => new Promise(() => {}));
  window.history.replaceState({}, "", "/compare");
  const view = render(<App />);
  expect(screen.getByRole("heading", { name: "Player Comparison" })).toBeInTheDocument();
  expect(chart("bar").datasets[0].label).toContain("2023/24");
  view.unmount();
  window.history.replaceState({}, "", "/timeline");
  render(<App />);
  expect(screen.getByRole("heading", { name: "Simulated Season Timeline" })).toBeInTheDocument();
  expect(chart("line").datasets[0].label).toContain("2023/24");
  expect(global.fetch).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("link", { name: "HOME" }));
  expect(screen.getByRole("textbox", { name: "Player A" })).toHaveValue("Player One");
  expect(screen.getByRole("combobox", { name: "Player A season" })).toHaveValue("2023");
});

test("unselected search drafts persist and the timeline navbar can resolve them after remount", async () => {
  const view = render(<App />);
  fireEvent.change(screen.getByRole("textbox", { name: "Player A" }), { target: { value: "One" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Player B" }), { target: { value: "Two" } });
  view.unmount();
  global.fetch.mockImplementation(async (url) => response(new URL(url).searchParams.get("search") === "One" ? [first] : [second]));
  render(<App />);
  expect(screen.getByRole("textbox", { name: "Player B" })).toHaveValue("Two");
  fireEvent.click(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("link", { name: "TIMELINE" }));
  await screen.findByRole("heading", { name: "Simulated Season Timeline" });
  expect(screen.getAllByRole("navigation", { name: "Primary" })).toHaveLength(1);
});

test("clearing the comparison removes saved players and drafts", async () => {
  const view = render(<App />);
  await selectPair();
  fireEvent.click(screen.getByRole("button", { name: "Clear comparison" }));
  expect(screen.getByRole("textbox", { name: "Player A" })).toHaveValue("");
  expect(JSON.parse(window.localStorage.getItem(SELECTION_KEY)).selection.player1).toBeNull();
  view.unmount();
  window.history.replaceState({}, "", "/compare");
  loadSeasonAvailability.mockImplementation(() => new Promise(() => {}));
  render(<App />);
  expect(screen.getByText("Select two players to open a comparison.")).toBeInTheDocument();
});

test("choosing Home cancels a pending navbar lookup without a late redirect", async () => {
  let resolve;
  global.fetch.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
  render(<App />);
  fireEvent.change(screen.getByRole("textbox", { name: "Player A" }), { target: { value: "One" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Player B" }), { target: { value: "Two" } });
  const nav = within(screen.getByRole("navigation", { name: "Primary" }));
  fireEvent.click(nav.getByRole("link", { name: "COMPARE" }));
  expect(screen.getByText("Finding players...")).toBeInTheDocument();
  fireEvent.click(nav.getByRole("link", { name: "HOME" }));
  await act(async () => resolve(response([first])));
  expect(window.location.pathname).toBe("/");
  expect(screen.queryByRole("heading", { name: "Player Comparison" })).not.toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Player B" })).toHaveValue("Two");
});

test("navbar and footer navigation keep the selected pair; timeline toggles never change points", async () => {
  render(<App />);
  await selectPair();
  const nav = within(screen.getByRole("navigation", { name: "Primary" }));
  fireEvent.click(nav.getByRole("link", { name: "COMPARE" }));
  expect(screen.getByRole("heading", { name: "Player Comparison" })).toBeInTheDocument();
  expect(chart("bar").datasets[1].data).toEqual([0, null, 20, null]);
  expect(chart("radar").datasets[0].data[1]).toBeNull();
  expect(screen.queryByTestId("pie")).not.toBeInTheDocument();
  expect(screen.getByText(/share cannot be calculated/i)).toBeInTheDocument();

  fireEvent.click(nav.getByRole("link", { name: "TIMELINE" }));
  const original = chart("line");
  fireEvent.click(screen.getByRole("button", { name: /Player Two/ }));
  expect(chart("line").datasets[0].data).toEqual(original.datasets[0].data);
  fireEvent.click(screen.getByRole("button", { name: /Player Two/ }));
  expect(chart("line")).toEqual(original);
  fireEvent.change(screen.getByLabelText("Metric:"), { target: { value: "assists" } });
  expect(chart("line").datasets[1].data).toEqual(Array(10).fill(null));
  expect(screen.getByText(/comparison for assists is unavailable/i)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Metric:"), { target: { value: "goals" } });
  expect(chart("line")).toEqual(original);

  fireEvent.click(within(screen.getByRole("contentinfo")).getByRole("link", { name: "Compare" }));
  expect(screen.getByRole("heading", { name: "Player One" })).toBeInTheDocument();
  fireEvent.click(nav.getByRole("link", { name: "HOME" }));
  expect(screen.getByRole("textbox", { name: "Player A" })).toHaveValue("Player One");
  expect(screen.getByRole("textbox", { name: "Player B" })).toHaveValue("Player Two");
});

test("network failure stops loading and retry succeeds", async () => {
  global.fetch.mockRejectedValueOnce(new TypeError("Network error")).mockResolvedValueOnce(response([first]));
  render(<App />);
  const panel = search("Player A", "One");
  expect(await panel.findByRole("alert")).toHaveTextContent(/could not connect/);
  expect(panel.getByRole("button", { name: "Search Player A" })).toBeEnabled();
  fireEvent.click(panel.getByRole("button", { name: "Retry search" }));
  expect(await panel.findByRole("heading", { name: "Player One" })).toBeInTheDocument();
  expect(panel.queryByRole("alert")).not.toBeInTheDocument();
});

test("no-results searches are visible and retryable", async () => {
  global.fetch.mockResolvedValueOnce(response([])).mockResolvedValueOnce(response([first]));
  render(<App />);
  const panel = search("Player A", "Missing");
  expect(await panel.findByText(/No players found/)).toHaveTextContent("2024/25");
  fireEvent.click(panel.getByRole("button", { name: "Retry search" }));
  await panel.findByRole("heading", { name: "Player One" });
});

test("a late response cannot replace a newer search result", async () => {
  let resolveOld;
  global.fetch.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }))
    .mockResolvedValueOnce(response([second]));
  render(<App />);
  search("Player A", "One");
  search("Player A", "Two");
  await screen.findByRole("heading", { name: "Player Two" });
  await act(async () => resolveOld(response([first])));
  expect(screen.queryByRole("heading", { name: "Player One" })).not.toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Player A" })).toHaveValue("Player Two");
});

test("a stalled request times out, stops loading and offers retry", async () => {
  jest.useFakeTimers();
  global.fetch.mockImplementation((url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  }));
  render(<App />);
  const panel = search("Player A", "One");
  await act(async () => jest.advanceTimersByTime(12000));
  expect(panel.getByRole("alert")).toHaveTextContent(/timed out/);
  expect(panel.getByRole("button", { name: "Search Player A" })).toBeEnabled();
  expect(panel.getByRole("button", { name: "Retry search" })).toBeEnabled();
});

test("empty direct routes still provide a working way back to player selection", async () => {
  window.history.replaceState({}, "", "/timeline");
  render(<App />);
  expect(screen.getByText(/Select two players to open a simulated timeline/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back to Search" }));
  expect(screen.getByRole("textbox", { name: "Player A" })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("button", { name: "Refresh seasons" })).toBeEnabled());
});

test("two recorded zero contribution totals show a clear empty pie state", () => {
  render(<MemoryRouter><ComparePage player1={player(2, "Zero One", 0)} player2={player(2, "Zero Two", 0)} /></MemoryRouter>);
  expect(screen.getByText("Both players have zero recorded goal contributions.")).toBeInTheDocument();
  expect(screen.queryByTestId("pie")).not.toBeInTheDocument();
  expect(chart("bar").datasets[0].data.slice(0, 2)).toEqual([0, 0]);
});

test("one zero contribution is retained in a valid pie, not treated as missing", () => {
  render(<MemoryRouter><ComparePage player1={first} player2={player(2, "Zero Two", 0)} /></MemoryRouter>);
  expect(chart("pie").datasets[0].data).toEqual([12, 0]);
});
