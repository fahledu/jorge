// What `levels:build` writes and `levels:check` compares (ADR 0012, ADR 0013): every level
// from 1 to 100, manual where `levels/manual/NNN.tmj` exists and generated otherwise, all
// through the reachability validator. Nothing is written here.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { generateLevel, type LibraryChunk } from "../src/domain/generator.ts";
import { buildGeneratedLevel, buildManualLevel, LEVEL_COUNT, tierOf } from "../src/domain/level.ts";
import { checkReachable } from "../src/domain/reach.ts";
import { applyTheme, themeOf } from "../src/domain/theme.ts";
import {
  type FileKind,
  formatTmjError,
  parseTmj,
  TILESET_PATH,
  type TmjMap,
} from "../src/domain/tmj.ts";
import { parseTsx } from "../src/domain/tsx.ts";

/** Where the game reads levels from; the embedded image path is relative to it. */
export const GENERATED_DIR = "levels/generated";
const MANUAL_DIR = "levels/manual";
const CHUNKS_DIR = "levels/chunks";
const CHUNK_NAME = /^[a-z0-9-]+\.tmj$/;

export interface LevelPlan {
  /** File name in `levels/generated/` → content. */
  outputs: Map<string, string>;
  errors: string[];
}

const toPosix = (p: string): string => p.split(path.sep).join("/");
const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");
const levelFile = (n: number): string => `${String(n).padStart(3, "0")}.json`;

function listTmj(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((name) => name.endsWith(".tmj"))
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; // fs errors carry a code
    throw error;
  }
}

/** Plans every level in memory; stops at the first error (ADR 0012). */
export function planLevels(root: string): LevelPlan {
  const outDir = path.join(root, GENERATED_DIR);
  const plan: LevelPlan = { outputs: new Map(), errors: [] };
  const fail = (...lines: string[]): LevelPlan => {
    plan.errors.push(...lines);
    plan.outputs.clear();
    return plan;
  };

  const tsxPath = path.join(root, TILESET_PATH);
  const tileset = parseTsx(readFileSync(tsxPath, "utf8"));
  const imagePath = toPosix(
    path.relative(outDir, path.resolve(path.dirname(tsxPath), tileset.image)),
  );

  /** Reads and checks one .tmj; a string is the error lines. */
  const read = (dir: string, name: string, kind: FileKind) => {
    const file = toPosix(path.relative(root, path.join(root, dir, name)));
    let json: unknown;
    try {
      json = JSON.parse(readFileSync(path.join(root, dir, name), "utf8"));
    } catch (error) {
      return [`${file}: invalid JSON (${error instanceof Error ? error.message : String(error)})`];
    }
    const parsed = parseTmj(json, { kind, file, tileset });
    return parsed.ok ? parsed.map : parsed.errors.map(formatTmjError);
  };

  const manual = new Map<number, TmjMap>();
  for (const name of listTmj(path.join(root, MANUAL_DIR))) {
    const number = /^(\d{3})\.tmj$/.exec(name)?.[1];
    const levelNumber = number === undefined ? 0 : Number(number);
    if (levelNumber < 1 || levelNumber > LEVEL_COUNT) {
      return fail(`${MANUAL_DIR}/${name}: name must be NNN.tmj, from 001 to ${LEVEL_COUNT}`);
    }
    const map = read(MANUAL_DIR, name, "manual");
    if (Array.isArray(map)) return fail(...map);
    manual.set(levelNumber, map);
  }

  const library: LibraryChunk[] = [];
  for (const name of listTmj(path.join(root, CHUNKS_DIR))) {
    if (!CHUNK_NAME.test(name)) {
      return fail(`${CHUNKS_DIR}/${name}: chunk names use only a-z, 0-9 and "-" (ADR 0013)`);
    }
    const map = read(CHUNKS_DIR, name, "chunk");
    if (Array.isArray(map)) return fail(...map);
    library.push({ name: name.slice(0, -".tmj".length), map });
  }

  for (let n = 1; n <= LEVEL_COUNT; n += 1) {
    const manualMap = manual.get(n);
    let map: TmjMap;
    let built: string;
    let label: string;
    if (manualMap !== undefined) {
      const manualLabel = `level ${n} (${MANUAL_DIR}/${levelFile(n).replace(".json", ".tmj")})`;
      if (manualMap.spawns.filter((s) => s.type === "secret").length > 1) {
        return fail(`${manualLabel}: a level has at most one "secret" spawn`);
      }
      // The same swap as a generated level of the same tier (plan 1g2, decision 3).
      map = { ...manualMap, ...applyTheme(manualMap.terrain, manualMap.decor, themeOf(tierOf(n))) };
      label = manualLabel;
      built = buildManualLevel({
        levelNumber: n,
        source: `manual/${levelFile(n).replace(".json", ".tmj")}`,
        map,
        tileset,
        imagePath,
        sha256,
      }).json;
    } else {
      const generated = generateLevel(n, library);
      if (!generated.ok) return fail(generated.error);
      map = generated.map;
      label = `level ${n} (chunks ${generated.chunks.join(", ")})`;
      built = buildGeneratedLevel({
        levelNumber: n,
        seed: generated.seed,
        chunks: generated.chunks,
        map,
        tileset,
        imagePath,
        sha256,
      }).json;
    }
    const start = map.spawns.find((s) => s.type === "start");
    const flag = map.spawns.find((s) => s.type === "flag");
    if (start === undefined || flag === undefined) {
      return fail(`${label}: needs one "start" and one "flag" spawn`);
    }
    const reach = checkReachable({ width: map.width, terrain: map.terrain, start, flag });
    if (!reach.ok) {
      return fail(`${label}: the flag is not reachable; farthest column ${reach.farthestCol}`);
    }
    plan.outputs.set(levelFile(n), built);
  }
  return plan;
}
