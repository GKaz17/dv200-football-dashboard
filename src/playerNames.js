import directory from "./playerDirectory.json";

// These Latin letters do not decompose into an ASCII base letter under NFD.
const LATIN_FOLD = {
  "\u00c6": "AE", "\u00e6": "ae", "\u00d8": "O", "\u00f8": "o",
  "\u0141": "L", "\u0142": "l", "\u0110": "D", "\u0111": "d",
  "\u00d0": "D", "\u00f0": "d", "\u00de": "Th", "\u00fe": "th",
  "\u0152": "OE", "\u0153": "oe", "\u00df": "ss", "\u1e9e": "SS",
  "\u0126": "H", "\u0127": "h", "\u0131": "i", "\u014a": "N", "\u014b": "n",
};
const LATIN_FOLD_PATTERN = new RegExp(`[${Object.keys(LATIN_FOLD).join("")}]`, "g");

export function cleanName(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(LATIN_FOLD_PATTERN, (letter) => LATIN_FOLD[letter])
    .replace(/['\u2019]/g, "").replace(/[^a-z0-9]+/gi, " ").trim();
}

export function normalizeName(value) { return cleanName(value).toLowerCase(); }

export function matchesPlayerName(player, query) {
  const names = [player.name, player.firstname, player.lastname, player.firstName, player.lastName, player.displayName,
    `${player.firstname ?? player.firstName ?? ""} ${player.lastname ?? player.lastName ?? ""}`].map(normalizeName).filter(Boolean);
  const needle = normalizeName(query);
  if (!needle) return false;
  const words = names.join(" ").split(/\s+/);
  return needle.split(" ").every((part) => words.some((word) => word.startsWith(part))) ||
    names.some((name) => name.replace(/ /g, "").includes(needle.replace(/ /g, "")));
}

export function nameHints(query, season) {
  return directory.players.filter((player) => player.season === Number(season) && matchesPlayerName(player, query));
}

export function rankPlayers(records, query) {
  const needle = normalizeName(query);
  const score = ({ player }) => {
    const names = [player.name, player.lastname, `${player.firstname ?? ""} ${player.lastname ?? ""}`].map(normalizeName);
    return names.includes(needle) ? 1 : 0;
  };
  return [...new Map(records.map((record) => [record.player.id, record])).values()]
    .sort((a, b) => score(b) - score(a) || a.player.name.localeCompare(b.player.name));
}
