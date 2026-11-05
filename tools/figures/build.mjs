// node tools/figures/build.mjs [--preview dir]   Writes public/figures/<id>.json
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k } from "./common.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../public/figures");
mkdirSync(OUT, { recursive: true });
const previewAt = process.argv.indexOf("--preview");
const css = readFileSync(join(HERE, "kit/iso.css"), "utf8");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);

for (const name of ["roaster", "referee", "fieldcase", "automaton", "lantern"]) {
  if (only && only !== name) continue;
  let mod; try { mod = await import(`./${name}.mjs`); } catch (e) { if (e.code === "ERR_MODULE_NOT_FOUND") continue; throw e; }
  const f = mod.build();
  const json = { id: f.id, width: f.width, height: f.height, label: f.label, P: f.P, paths: f.paths, body: f.body };
  writeFileSync(join(OUT, `${f.id}.json`), JSON.stringify(json));
  console.log(f.id, (JSON.stringify(json).length / 1024).toFixed(0) + " KB", "solids", (f.body.match(/iso-solid/g) || []).length, "paths", (f.body.match(/<path/g) || []).length);
  if (previewAt > 0) {
    const dir = process.argv[previewAt + 1];
    writeFileSync(join(dir, `${f.id}.html`), `<!doctype html><meta charset=utf8><style>${css}body{margin:0;background:#0a0a0f}.iso{--anatomy-paper:#0e0e14;--anatomy-face:#2a2a33;--anatomy-top:#2c2c36;--anatomy-shade-0:#14141a;--anatomy-shade-1:#191920;--anatomy-shade-2:#1f1f27;--anatomy-shade-3:#25252e;--anatomy-lit-top:#3a2422;--anatomy-lit-shade:#2c1a19;--anatomy-hi:#f1f1f5;--anatomy-mid:#9a9aa8;--anatomy-lo:#5b5b68;--anatomy-faint:#3b3b46;--anatomy-lit:#ff5243;--anatomy-dot:#f2f2f6;--anatomy-weight:.7px}.fg-beans-pile ellipse{fill:#6d4a30;stroke:#1a100a;stroke-width:.4}.fg-port{fill:#120806}.fg-lamp{fill:#333}.fg-hub{fill:#d4d4d4}.fg-paper{fill:#d8d2c4}.fg-dark-squares{fill:#0c0c11}.fg-well{fill:#07070b}.fg-foam{fill:#14141a}.fg-screen{fill:#0a1410}.fg-bar{fill:#222}.fg-ink{stroke:#3a342b}.fg-glass{fill:rgba(190,215,225,.12)}.fg-art{fill:#f4efe6;opacity:.9}.fg-screen-cloth{fill:#0a1214}</style><div class="iso" style="width:${f.width}px">${k.figureSvg({ width: f.width, height: f.height, label: f.label, body: f.body })}</div>`);
  }
}
