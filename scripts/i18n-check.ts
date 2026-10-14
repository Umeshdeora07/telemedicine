/**
 * Lists on-screen strings that have no translation yet.
 *   npm run i18n:check -- hi        (missing Hindi strings)
 *   npm run i18n:check -- hi --json (as JSON, to hand to a translator)
 */
import fs from "node:fs";
import path from "node:path";

const locale = process.argv[2] ?? "hi";
const asJson = process.argv.includes("--json");
const root = path.join(process.cwd(), "src");
const files: string[] = [];
(function walk(dir: string) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|ts)$/.test(e.name) && !p.includes(`${path.sep}dictionaries${path.sep}`) && !p.includes(`${path.sep}seed${path.sep}`)) files.push(p);
  }
})(root);

const keys = new Set<string>();
const re = /\bt\(\s*"((?:[^"\\]|\\.)*)"/g;
const reTp = /\btp\(\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"/g;
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(re)) keys.add(JSON.parse(`"${m[1]}"`));
  for (const m of src.matchAll(reTp)) {
    keys.add(JSON.parse(`"${m[1]}"`));
    keys.add(JSON.parse(`"${m[2]}"`));
  }
}

async function main() {
  const mod = await import(path.join(root, "i18n", "dictionaries", `${locale}.ts`));
  const dict: Record<string, string> = mod.default;
  const missing = [...keys].filter((k) => !(k in dict)).sort();
  if (asJson) console.log(JSON.stringify(Object.fromEntries(missing.map((k) => [k, ""])), null, 2));
  else {
    console.log(`${missing.length} of ${keys.size} strings missing for "${locale}"`);
    for (const k of missing) console.log(" -", k);
  }
}
main();
