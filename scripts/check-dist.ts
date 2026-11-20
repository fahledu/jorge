// The production build must not carry the E2E shortcut, the fps meter nor the level picked
// by the address (ADR 0010, plan 1g).
// Runs at the end of `pnpm build`.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const FORBIDDEN = ["__jorgeTest", "fps-meter", "level-from-url"];
const dist = path.resolve(import.meta.dirname, "..", "dist");

const found: string[] = [];
for (const entry of readdirSync(dist, { withFileTypes: true, recursive: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".js")) continue;
  const file = path.join(entry.parentPath, entry.name);
  const code = readFileSync(file, "utf8");
  for (const word of FORBIDDEN) {
    if (code.includes(word)) found.push(`${path.relative(dist, file)}: ${word}`);
  }
}
if (found.length > 0) {
  process.stderr.write(`check-dist: development code in dist/:\n${found.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write("check-dist: ok\n");
