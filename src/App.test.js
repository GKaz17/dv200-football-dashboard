import { act, fireEvent, render, screen, within } from "@testing-library/react";
import App from "./App";
import ComparePage from "./pages/ComparePage";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-chartjs-2", () => ({
  Radar: ({ data }) => <div data-testid="radar" data-chart={JSON.stringify(data)} />,
  Bar: ({ data }) => <div data-testid="bar" data-chart={JSON.stringify(data)} />,
  Pie: ({ data }) => <div data-testid="pie" data-chart={JSON.stringify(data)} />,
  Line: ({ data }) => <div data-testid="line" data-chart={JSON.stringify(data)} />,
}));

const player = (id, name, assists = 2) => ({
  player: { id, name, photo: "/Logo_PitchStats.png" },
  statistics: [{ team: { name: "Test Club" }, games: { position: "Attacker" },
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
  window.history.replaceState({}, "", "/");
  process.env.REACT_APP_API_SPORTS_KEY = "test-key";
  global.fetch = jest.fn().mockResolvedValue(response([first]));
});
afterEach(() => {
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

test("season/source copy is accurate and branding has no placeholder contact or dead actions", () => {
  render(<App />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("2024/25");
  expect(screen.getByText("DATA FROM API-SPORTS")).toBeInTheDocument();
  expect(screen.queryByText(/OPTA|heatmap|xG|Export Insights|support@|PL Compare/i)).not.toBeInTheDocument();
  expect(document.querySelector(".nav-actions")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "GitHub repository" })).toHaveAttribute("href", "https://github.com/GKaz17/dv200-football-dashboard");
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

  fireEvent.click(nav.getByRole("link", { name: "STATS" }));
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

test("empty direct routes still provide a working way back to player selection", () => {
  window.history.replaceState({}, "", "/timeline");
  render(<App />);
  expect(screen.getByText(/Select two players to open a simulated timeline/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back to Search" }));
  expect(screen.getByRole("textbox", { name: "Player A" })).toBeInTheDocument();
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
