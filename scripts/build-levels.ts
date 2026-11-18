// `pnpm levels:build`: normalizes levels/manual/NNN.tmj into levels/generated/NNN.json
// (ADR 0005, ADR 0012). The generator of the other levels arrives in item 1g.
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildManualLevel, LEVEL_COUNT } from "../src/domain/level.ts";
import { formatTmjError, parseTmj, TILESET_PATH } from "../src/domain/tmj.ts";
import { parseTsx } from "../src/domain/tsx.ts";

/** Where the game reads levels from; the embedded image path is relative to it. */
const GENERATED_DIR = "levels/generated";
const MANUAL_DIR = "levels/manual";

export interface BuildOptions {
  /** Repository root: holds levels/ and assets/. */
  root: string;
}

export interface BuildResult {
  written: string[];
  removed: string[];
  errors: string[];
}

const toPosix = (p: string): string => p.split(path.sep).join("/");
const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

export function buildLevels({ root }: BuildOptions): BuildResult {
  const manualDir = path.join(root, MANUAL_DIR);
  const outDir = path.join(root, GENERATED_DIR);
  const result: BuildResult = { written: [], removed: [], errors: [] };

  const tsxPath = path.join(root, TILESET_PATH);
  const tileset = parseTsx(readFileSync(tsxPath, "utf8"));
  const imagePath = toPosix(
    path.relative(outDir, path.resolve(path.dirname(tsxPath), tileset.image)),
  );

  let sources: string[] = [];
  try {
    sources = readdirSync(manualDir).filter((name) => name.endsWith(".tmj"));
  } catch (error) {
    // No manual folder: nothing to build, stale outputs are still removed below.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; // fs errors carry a code
  }
  sources.sort();

  const outputs = new Map<string, string>();
  for (const name of sources) {
    const file = toPosix(path.relative(root, path.join(manualDir, name)));
    const number = /^(\d{3})\.tmj$/.exec(name)?.[1];
    const levelNumber = number === undefined ? 0 : Number(number);
    if (levelNumber < 1 || levelNumber > LEVEL_COUNT) {
      result.errors.push(`${file}: name must be NNN.tmj, from 001 to ${LEVEL_COUNT}`);
      return result;
    }
    let json: unknown;
    try {
      json = JSON.parse(readFileSync(path.join(manualDir, name), "utf8"));
    } catch (error) {
      result.errors.push(
        `${file}: invalid JSON (${error instanceof Error ? error.message : String(error)})`,
      );
      return result;
    }
    const parsed = parseTmj(json, { kind: "manual", file, tileset });
    if (!parsed.ok) {
      result.errors.push(...parsed.errors.map(formatTmjError));
      return result; // stops at the first invalid file (ADR 0012)
    }
    const built = buildManualLevel({
      levelNumber,
      source: `manual/${name}`,
      map: parsed.map,
      tileset,
      imagePath,
      sha256,
    });
    outputs.set(`${number}.json`, built.json);
  }

  mkdirSync(outDir, { recursive: true });
  for (const name of readdirSync(outDir)) {
    if (name.endsWith(".json") && !outputs.has(name)) {
      rmSync(path.join(outDir, name));
      result.removed.push(name);
    }
  }
  for (const [name, json] of outputs) {
    const target = path.join(outDir, name);
    let current: string | null = null;
    try {
      current = readFileSync(target, "utf8");
    } catch {
      // New level.
    }
    if (current !== json) {
      writeFileSync(target, json);
      result.written.push(name);
    }
  }
  return result;
}

if (import.meta.main) {
  const root = path.resolve(import.meta.dirname, "..");
  const result = buildLevels({ root });
  if (result.errors.length > 0) {
    for (const line of result.errors) process.stderr.write(`${line}\n`);
    process.exit(1);
  }
  const changed = [...result.written.map((n) => `+ ${n}`), ...result.removed.map((n) => `- ${n}`)];
  process.stdout.write(
    changed.length > 0 ? `levels:build: ${changed.join(", ")}\n` : "levels:build: up to date\n",
  );
}
