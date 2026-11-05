// Runs before every build (npm's prebuild). Writes data/github.json from GitHub's public data, so the
// activity graph ships as a snapshot of the day the site was last deployed. A failed fetch keeps the last
// snapshot and never fails the build.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const USER = "MdKasif0";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../data/github.json");
const get = async (url, headers = {}) => {
  const response = await fetch(url, { headers: { "User-Agent": "kasif-portfolio-build", ...headers }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response;
};

try {
  const html = await (await get(`https://github.com/users/${USER}/contributions`, { "X-Requested-With": "XMLHttpRequest" })).text();
  const counts = new Map();
  for (const [, id, text] of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]+)<\/tool-tip>/g)) {
    counts.set(id, /^No /.test(text) ? 0 : Number(text.replace(/,/g, "").match(/^\d+/)?.[0] ?? 0));
  }
  const days = [...html.matchAll(/<td\b[^>]*\bdata-date="(\d{4}-\d\d-\d\d)"[^>]*>/g)].map(([tag, date]) => ({
    date,
    level: Number(tag.match(/data-level="(\d)"/)?.[1] ?? 0),
    count: counts.get(tag.match(/\bid="([^"]+)"/)?.[1]) ?? 0
  })).sort((a, b) => a.date.localeCompare(b.date));
  const total = Number(html.match(/([\d,]+)\s+contributions?\s+in the last year/)?.[1].replace(/,/g, ""));
  if (days.length < 300 || !Number.isFinite(total)) throw new Error(`unexpected contributions page: ${days.length} days, total ${total}`);

  const repos = await (await get(`https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`, { Accept: "application/vnd.github+json" })).json();
  const own = repos.filter((repo) => !repo.fork);
  const latest = own[0];
  writeFileSync(OUT, `${JSON.stringify({
    user: USER,
    asOf: new Date().toISOString().slice(0, 10),
    contributions: total,
    start: days[0].date,
    levels: days.map((day) => day.level).join(""),
    counts: days.map((day) => day.count),
    repos: own.length,
    stars: own.reduce((sum, repo) => sum + repo.stargazers_count, 0),
    lastPush: latest ? { repo: latest.name, at: latest.pushed_at } : null
  })}\n`);
  console.log(`github: ${total} contributions, ${own.length} repos, ${own.reduce((sum, repo) => sum + repo.stargazers_count, 0)} stars`);
} catch (error) {
  readFileSync(OUT);
  console.warn(`github: keeping the last snapshot (${error.message})`);
}
