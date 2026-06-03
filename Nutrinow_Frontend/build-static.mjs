import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

function minifyHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>+~])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

await writeFile(join(dist, "index.html"), minifyHtml(await readFile(join(root, "index.html"), "utf8")));
await writeFile(join(dist, "styles.css"), minifyCss(await readFile(join(root, "styles.css"), "utf8")));
await cp(join(root, "app.js"), join(dist, "app.js"));
await cp(join(root, "modules"), join(dist, "modules"), { recursive: true });
await cp(join(root, "assets"), join(dist, "assets"), { recursive: true });

console.log("Static build created in dist/");
