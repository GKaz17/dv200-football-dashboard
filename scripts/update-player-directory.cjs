const fs = require("node:fs/promises");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { parse } = require("csv-parse/sync");

const revision = "d7b05b51d137bfefef4b692386d18c610975b9b9";
const seasons = [2022, 2023, 2024];
const repository = "vaastav/Fantasy-Premier-League";
const root = path.resolve(__dirname, "..");

async function source(file) {
  if (process.argv.includes("--github-cli")) {
    const encoded = execFileSync("gh", ["api", `repos/${repository}/contents/${file}?ref=${revision}`, "--jq", ".content"], { encoding: "utf8" });
    return Buffer.from(encoded.replace(/\s/g, ""), "base64").toString("utf8");
  }
  const response = await fetch(`https://raw.githubusercontent.com/${repository}/${revision}/${file}`, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Directory source failed: ${file} (${response.status})`);
  return response.text();
}

(async () => {
  const players = [];
  for (const season of seasons) {
    const folder = `data/${season}-${String(season + 1).slice(-2)}`;
    const teams = new Map(parse(await source(`${folder}/teams.csv`), { columns: true, skip_empty_lines: true, bom: true })
      .map((team) => [Number(team.id), team]));
    const rows = parse(await source(`${folder}/players_raw.csv`), { columns: true, skip_empty_lines: true, bom: true });
    for (const row of rows) {
      const team = teams.get(Number(row.team));
      if (!row.first_name || !row.second_name || !team?.name) throw new Error(`Incomplete directory row in ${season}`);
      players.push({ season, firstName: row.first_name, lastName: row.second_name, displayName: row.web_name,
        club: team.name, clubCode: team.short_name });
    }
  }
  const unique = [...new Map(players.map((player) => [JSON.stringify(player), player])).values()];
  const directory = { source: `https://github.com/${repository}`, revision, seasons,
    purpose: "Names and club hints only. Never use this catalogue as comparison statistics or proof of API coverage.", players: unique };
  await fs.writeFile(path.join(root, "src/playerDirectory.json"), JSON.stringify(directory, null, 2) + "\n");
  await fs.writeFile(path.join(root, "public/player-directory-LICENSE.txt"), await source("LICENSE"));
  console.log(`Generated ${unique.length} names-only entries for ${seasons.join(", ")}. No sports-API requests used.`);
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
