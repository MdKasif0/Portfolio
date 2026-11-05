// Dev-only: runs headless Chrome from the command line, so these tools need nothing installed.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  join(homedir(), "Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
  "/usr/bin/google-chrome"
].filter(Boolean);

export function chrome(args) {
  const binary = CANDIDATES.find((path) => existsSync(path));
  if (!binary) throw new Error("Chrome not found. Set CHROME_PATH.");
  execFileSync(binary, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--virtual-time-budget=4000", ...args], { stdio: "ignore", timeout: 60000 });
}
