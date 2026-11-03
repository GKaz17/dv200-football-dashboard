import { cleanName, matchesPlayerName, nameHints } from "./playerNames";

test("normalizes accents, initials, punctuation and whitespace", () => {
  expect(cleanName("  E.  Eze ")).toBe("E Eze");
  expect(cleanName("Jo\u00e3o O'Neil-Smith")).toBe("Joao ONeil Smith");
});

test.each([
  ["\u00d8degaard", "Odegaard"], ["\u00f8degaard", "odegaard"], ["\u0141ukasz", "Lukasz"],
  ["\u00c6gir", "AEgir"], ["\u0152zil", "OEzil"], ["Gro\u00df", "Gross"],
  ["\u0110or\u0111e", "Dorde"], ["\u00deor", "Thor"], ["I\u011fd\u0131r", "Igdir"],
])("folds non-decomposing Latin letters in %s without dropping name characters", (input, expected) => {
  expect(cleanName(input)).toBe(expected);
});

test.each(["Odegaard", "\u00d8degaard", "Martin Odegaard", "Martin \u00d8degaard"])(
  "finds the same season-specific directory identity for %s", (query) => {
    const hints = nameHints(query, 2024);
    expect(hints).toHaveLength(1);
    expect(hints[0]).toMatchObject({ firstName: "Martin", lastName: "\u00d8degaard", club: "Arsenal" });
    const player = { name: "M. \u00d8degaard", firstname: "Martin", lastname: "\u00d8degaard" };
    expect(matchesPlayerName(player, query)).toBe(true);
    expect(player.name).toBe("M. \u00d8degaard");
  },
);

test("matches first names, short surnames, full names and initials without changing identity", () => {
  const player = { name: "E. Eze", firstname: "Eberechi Oluchi", lastname: "Eze" };
  for (const query of ["Eze", "Eberechi", "Eberechi Eze", "E. Eze", "eberechi oluchi eze"]) {
    expect(matchesPlayerName(player, query)).toBe(true);
  }
  expect(matchesPlayerName(player, "John Eze")).toBe(false);
  expect(matchesPlayerName(player, "***")).toBe(false);
});

test("directory supplies season-specific name hints, never statistics or API player IDs", () => {
  const hints = nameHints("Eberechi Eze", 2024);
  expect(hints).toHaveLength(1);
  expect(hints[0]).toMatchObject({ firstName: "Eberechi", lastName: "Eze", club: "Crystal Palace", clubCode: "CRY" });
  expect(hints[0]).not.toHaveProperty("statistics");
  expect(hints[0]).not.toHaveProperty("id");
  expect(nameHints("Eze", 2026)).toEqual([]);
});
