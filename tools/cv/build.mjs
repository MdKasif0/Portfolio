// node tools/cv/build.mjs   Prints tools/cv/cv.html to public/cv.pdf with real, selectable text.
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chrome } from "../lib/chrome.mjs";

const here = dirname(fileURLToPath(import.meta.url));
chrome(["--no-pdf-header-footer", `--print-to-pdf=${join(here, "../../public/cv.pdf")}`, pathToFileURL(join(here, "cv.html")).href]);
console.log("public/cv.pdf");
