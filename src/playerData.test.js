import { formatStat, percentage, playerMetrics, relativePair, simulatedTimeline, statNumber } from "./playerData";

test("missing, blank and invalid statistics remain unavailable while a real zero is retained", () => {
  [null, undefined, "", "  ", "unknown", -1, Infinity, false].forEach((value) => expect(statNumber(value)).toBeNull());
  expect(statNumber(0)).toBe(0);
  expect(statNumber("0")).toBe(0);
  expect(statNumber("42")).toBe(42);
  expect(formatStat(null, true)).toBe("N/A");
  expect(formatStat(0, true)).toBe("0%");
});

test("rates need a known numerator and nonzero denominator", () => {
  expect(percentage(0, 10)).toBe(0);
  expect(percentage(2, 4)).toBe(50);
  expect(percentage(null, 4)).toBeNull();
  expect(percentage(0, 0)).toBeNull();
});

test("derived totals do not silently replace missing fields with zero", () => {
  const stats = playerMetrics({ statistics: [{ goals: { total: 0, assists: null }, shots: { total: 4, on: 0 } }] });
  expect(stats.goals).toBe(0);
  expect(stats.assists).toBeNull();
  expect(stats.contributions).toBeNull();
  expect(stats.tackles).toBeNull();
  expect(stats.shotAccuracy).toBe(0);
});

test("radar axes require both records and are relative to the selected pair", () => {
  expect(relativePair(5, 10)).toEqual([50, 100]);
  expect(relativePair(0, 0)).toEqual([0, 0]);
  expect(relativePair(0, 10)).toEqual([0, 100]);
  expect(relativePair(null, 10)).toEqual([null, null]);
});

test("simulation is stable, monotonic, bounded, and ends at the recorded total", () => {
  const points = simulatedTimeline(100, "10:goals");
  expect(points).toEqual(simulatedTimeline(100, "10:goals"));
  expect(points).toHaveLength(10);
  expect(points[9]).toBe(100);
  points.forEach((value, index) => {
    expect(value).toBeGreaterThanOrEqual(index ? points[index - 1] : 0);
    expect(value).toBeLessThanOrEqual(100);
  });
  expect(simulatedTimeline(0, "zero")).toEqual(Array(10).fill(0));
  expect(simulatedTimeline(null, "missing")).toEqual(Array(10).fill(null));
});
