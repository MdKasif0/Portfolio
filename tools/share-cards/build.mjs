// node tools/share-cards/build.mjs   Writes the 1200×630 share images to public/og/ with headless Chrome and sips (macOS).
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chrome } from "../lib/chrome.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const asset = (path) => pathToFileURL(join(root, path)).href;
const OUT = join(root, "public/og");
mkdirSync(OUT, { recursive: true });

const THEMES = {
  ember: { bg: "#0a0807", accent: "#ff7a2e", ink: "#f6f1ea", soft: "#bdb5ab", glow: "255,122,46" },
  brand: { bg: "#08080d", accent: "#ff5243", ink: "#f4f4f6", soft: "#b9b9c2", glow: "229,50,45" },
  moon: { bg: "#060d0e", accent: "#ff5a4f", ink: "#eef3f1", soft: "#aebbb8", glow: "70,170,160" }
};

const CARDS = [
  { file: "gitroasted", kind: "Case study", title: "GitRoasted", theme: "ember", art: "public/projects/gitroasted.webp", value: "~2.1s", label: "Median live roast. The score comes from code, the words from an LLM." },
  { file: "cookie", kind: "Case study", title: "Cookie", theme: "brand", art: "public/projects/cookie.webp", value: "10 days", label: "From first commit to shipping on macOS and Windows." },
  { file: "shadow-of-the-crimson-gate", kind: "Case study", title: "Shadow of the Crimson Gate", theme: "moon", art: "public/projects/shadow-of-the-crimson-gate.webp", value: "237 KB", label: "of JavaScript to start a real action game in a browser tab." },
  { file: "notes", kind: "From the workshop", title: "Engineering notes", theme: "brand", value: "4 notes", label: "Real bugs and bad calls, with the code that caused them.", text: true },
  { file: "note-fallback-list-with-one-model", kind: "Engineering note · GitRoasted", title: "My fallback list only held one model", theme: "ember", value: "1", label: "Model in my two-model fallback list", text: true },
  { file: "note-should-be-secured-in-production", kind: "Engineering note · GitRoasted", title: "“Should be secured in production” was in production", theme: "ember", value: "347", label: "Days a demo rule stayed live", text: true },
  { file: "note-clamp-needs-a-range", kind: "Engineering note · Cookie", title: "A clamp only works if its range exists", theme: "brand", value: "25 pt", label: "Safe distance from a window's corners", text: true },
  { file: "note-fifteen-minute-lantern-fix", kind: "Engineering note · Crimson Gate", title: "I fixed the lighting by deleting the lanterns. It lasted 15 minutes.", theme: "moon", value: "15 min", label: "How long the fix lasted", text: true }
];

const html = (card) => {
  const t = THEMES[card.theme];
  const long = card.title.length > 16;
  return `<!doctype html><meta charset="utf-8"><style>
    @font-face { font-family: Anton; src: url("${asset("tools/fonts/anton.woff2")}"); }
    @font-face { font-family: Jakarta; src: url("${asset("tools/fonts/jakarta.woff2")}"); font-weight: 200 800; }
    @font-face { font-family: Mono; src: url("${asset("tools/fonts/mono.woff2")}"); }
    * { box-sizing: border-box; margin: 0; }
    html, body { width: 1200px; height: 630px; overflow: hidden; background: ${t.bg}; }
    body { position: relative; padding: 52px 60px; color: ${t.ink}; font-family: Jakarta, sans-serif; }
    .glow { position: absolute; right: -180px; bottom: -280px; width: 820px; height: 720px; border-radius: 50%; background: radial-gradient(closest-side, rgba(${t.glow},.34), transparent); }
    .art { position: absolute; top: 0; right: 0; bottom: 0; width: 540px; background: url("${card.art ? asset(card.art) : ""}") right center / auto 100%; opacity: .72; mask-image: linear-gradient(90deg, transparent 4%, #000 52%); }
    .top { position: relative; display: flex; align-items: center; gap: 14px; }
    .top img { width: 46px; height: 46px; border-radius: 12px; }
    .top b { font: 400 30px/1 Anton; letter-spacing: .2px; }
    .top b i { color: ${t.accent}; font-style: normal; }
    .kind { position: absolute; top: 64px; right: 60px; color: ${t.soft}; font: 500 18px/1.2 Mono; }
    h1 { position: relative; margin-top: ${card.text ? 62 : long ? 58 : 76}px; max-width: ${card.text ? 1040 : 660}px; ${card.text
      ? `font: 700 ${card.title.length > 44 ? 58 : 68}px/1.06 Jakarta; letter-spacing: -2px;`
      : `font: 400 ${long ? 92 : 148}px/1 Anton; letter-spacing: .4px;`} }
    .stat { position: absolute; left: 60px; right: ${card.text ? 60 : 500}px; bottom: 50px; display: flex; align-items: flex-end; gap: 22px; padding-top: 22px; border-top: 1px solid rgba(255,255,255,.2); }
    .stat strong { flex: none; color: ${t.accent}; font: 400 76px/.96 Anton; }
    .stat span { max-width: 460px; color: ${t.soft}; font-size: 22px; font-weight: 500; line-height: 1.28; }
  </style><div class="glow"></div>${card.art ? `<div class="art"></div>` : ""}
  <div class="top"><img src="${asset("public/logo-mark.png")}"><b>KASIF<i>.</i></b></div><div class="kind">${card.kind}</div>
  <h1>${card.title}</h1><div class="stat"><strong>${card.value}</strong><span>${card.label}</span></div>`;
};

const work = mkdtempSync(join(tmpdir(), "share-cards-"));
for (const card of CARDS) {
  const page = join(work, `${card.file}.html`);
  const png = join(work, `${card.file}.png`);
  writeFileSync(page, html(card));
  chrome(["--allow-file-access-from-files", "--window-size=1200,630", "--force-device-scale-factor=1", `--screenshot=${png}`, pathToFileURL(page).href]);
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "86", png, "--out", join(OUT, `${card.file}.jpg`)], { stdio: "ignore" });
  console.log(`public/og/${card.file}.jpg`);
}
rmSync(work, { recursive: true, force: true });
