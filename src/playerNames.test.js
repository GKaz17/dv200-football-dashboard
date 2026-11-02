import { cleanName, matchesPlayerName, nameHints } from "./playerNames";

test("normalizes accents, initials, punctuation and whitespace", () => {
  expect(cleanName("  E.  Eze ")).toBe("E Eze");
  expect(cleanName("Jo\u00e3o O'Neil-Smith")).toBe("Joao ONeil Smith");
});

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
