import directory from "./playerDirectory.json";

export function cleanName(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
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
