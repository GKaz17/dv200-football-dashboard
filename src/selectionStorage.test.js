import { clearSavedSelection, emptySelection, readSelection, saveSelection, SELECTION_KEY } from "./selectionStorage";

function memoryStorage() {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
}
const player = (season = 2023, age = 0) => ({
  player: { id: 306, name: "Example", photo: "https://example.com/player.png" },
  statistics: [{ league: { id: 39, season }, team: { id: 40, name: "Club" }, goals: { total: 0, assists: null } }],
  selectionSeason: season, selectedAt: Date.now() - age, apiKey: "must-not-be-stored",
});

test("records, drafts and seasons survive storage without persisting credentials or extra provider fields", () => {
  const storage = memoryStorage();
  saveSelection({ ...emptySelection(), player1: player(), season1: 2023, query1: "Example", query2: "Salah" }, storage);
  const restored = readSelection(storage);
  expect(restored.player1.statistics[0].goals).toEqual({ total: 0, assists: null });
  expect(restored.season1).toBe(2023);
  expect(restored.query2).toBe("Salah");
  expect(storage.getItem(SELECTION_KEY)).not.toContain("must-not-be-stored");
  clearSavedSelection(storage);
  expect(storage.getItem(SELECTION_KEY)).toBeNull();
});

test("expired records keep draft names and years for a fresh lookup", () => {
  const storage = memoryStorage();
  saveSelection({ ...emptySelection(), player1: player(2023, 25 * 60 * 60 * 1000), season1: 2023, query1: "Example" }, storage);
  expect(readSelection(storage)).toMatchObject({ player1: null, query1: "Example", season1: 2023 });
});

test("corrupt, mismatched, future-version and oversized storage cannot crash or restore a wrong-season record", () => {
  const storage = memoryStorage();
  for (const raw of ["not json", JSON.stringify({ version: 2 }), "x".repeat(524289)]) {
    storage.setItem(SELECTION_KEY, raw);
    expect(readSelection(storage)).toEqual(emptySelection());
  }
  storage.setItem(SELECTION_KEY, JSON.stringify({ version: 1, selection: { ...emptySelection(), player1: player(2023), season1: 2024, query1: "Example" } }));
  expect(readSelection(storage).player1).toBeNull();
});

test("blocked browser storage falls back to in-memory use", () => {
  const storage = { getItem: () => { throw new Error("Blocked"); }, setItem: () => { throw new Error("Blocked"); } };
  expect(readSelection(storage)).toEqual(emptySelection());
  expect(saveSelection(emptySelection(), storage)).toBe(false);
  expect(() => clearSavedSelection(storage)).not.toThrow();
});
