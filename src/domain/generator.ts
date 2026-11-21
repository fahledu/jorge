// Level generator of ADR 0013: draws a start chunk, the middle chunks and a finish chunk
// with the level's own sequence, joins them side by side, redraws the edges at the joins
// swaps the tiles for the tier's theme and turns spawns on or off by tier, enemy density and
// the draw of the secret item. Pure: the scripts read the files.
import {
  chunkWeight,
  difficultyWindow,
  enemyDensity,
  FLYER_MIN_TIER,
  FLYER_V_MIN_TIER,
  middleChunkCount,
  SPIKY_MIN_TIER,
  tierOf,
} from "./curve.ts";
import { isSolid } from "./enemies.ts";
import { createPrng, levelSeed } from "./prng.ts";
import { applyTheme, type Theme, themeOf } from "./theme.ts";
import { EDGE_FAMILIES, THEME_TILES } from "./tiles.ts";
import { MAP_HEIGHT, type Spawn, TILE_SIZE, type TmjMap } from "./tmj.ts";

/** Attempts of a level whose chunks run out of candidates before failing the build. */
export const MAX_ATTEMPTS = 20;
/** A chunk may start at most this many rows above where the previous one ended. */
const MAX_STEP_UP = 2;

export interface LibraryChunk {
  /** File name without `.tmj`. */
  name: string;
  map: TmjMap;
}

export type GeneratedLevel =
  | { ok: true; map: TmjMap; chunks: string[]; seed: number; tier: number }
  | { ok: false; error: string };

interface Candidate {
  name: string;
  map: TmjMap;
  difficulty: number;
  entryRow: number;
  exitRow: number;
}

const byName = (a: { name: string }, b: { name: string }): number =>
  a.name < b.name ? -1 : a.name > b.name ? 1 : 0;

/** Generates level `levelNumber` from the chunk library; the same input, the same output. */
export function generateLevel(
  levelNumber: number,
  library: readonly LibraryChunk[],
  themeTable: Partial<Record<Theme, ReadonlyMap<number, number>>> = THEME_TILES,
): GeneratedLevel {
  const tier = tierOf(levelNumber);
  const where = `level ${levelNumber} (tier ${tier})`;
  const starts: Candidate[] = [];
  const finishes: Candidate[] = [];
  const middles: Candidate[] = [];
  for (const { name, map } of [...library].sort(byName)) {
    if (map.chunk === null) return { ok: false, error: `chunk ${name} has no chunk properties` };
    const { tags, difficulty, entryRow, exitRow } = map.chunk;
    const candidate = { name, map, difficulty, entryRow, exitRow };
    const isStart = tags.includes("start");
    const isFinish = tags.includes("finish");
    if (isStart && isFinish) {
      return { ok: false, error: `chunk ${name} has both the "start" and "finish" tags` };
    }
    if (isStart) starts.push(candidate);
    else if (isFinish) finishes.push(candidate);
    else middles.push(candidate);
  }
  if (starts.length === 0) return { ok: false, error: `${where}: no chunk with the "start" tag` };
  if (finishes.length === 0)
    return { ok: false, error: `${where}: no chunk with the "finish" tag` };
  const range = difficultyWindow(tier);
  const inWindow = middles.filter((c) => chunkWeight(tier, c.difficulty) > 0);
  if (inWindow.length === 0) {
    return {
      ok: false,
      error: `${where}: no middle chunk with difficulty ${range.min} to ${range.max}`,
    };
  }

  const seed = levelSeed(levelNumber);
  const random = createPrng(seed);
  const count = middleChunkCount(levelNumber);
  const fits = (c: Candidate, previous: Candidate): boolean =>
    c.entryRow >= previous.exitRow - MAX_STEP_UP && c.name !== previous.name;

  let chosen: Candidate[] | null = null;
  let failure = "";
  for (let attempt = 0; attempt < MAX_ATTEMPTS && chosen === null; attempt += 1) {
    const start = starts[Math.floor(random() * starts.length)] as Candidate; // index < length
    const sequence = [start];
    let previous = start;
    let stuck = false;
    for (let position = 1; position <= count + 1; position += 1) {
      const isFinish = position === count + 1;
      const options = (isFinish ? finishes : inWindow).filter((c) => fits(c, previous));
      if (options.length === 0) {
        failure =
          `${where}: no chunk fits ${isFinish ? "the finish" : `middle position ${position}`} ` +
          `after ${previous.name} (exitRow ${previous.exitRow})`;
        stuck = true;
        break;
      }
      const next = isFinish ? pickEqual(options, random()) : pickWeighted(options, tier, random());
      sequence.push(next);
      previous = next;
    }
    if (!stuck) chosen = sequence;
  }
  if (chosen === null) return { ok: false, error: `${failure}, after ${MAX_ATTEMPTS} attempts` };

  const map = join(chosen.map((c) => c.map));
  // The edges were redrawn with the base palette above; only now do the tiles change.
  try {
    Object.assign(map, applyTheme(map.terrain, map.decor, themeOf(tier), themeTable));
  } catch (error) {
    return { ok: false, error: `${where}: ${error instanceof Error ? error.message : error}` };
  }
  map.spawns = activeSpawns(chosen, levelNumber, tier, random);
  return { ok: true, map, chunks: chosen.map((c) => c.name), seed, tier };
}

function pickEqual(options: readonly Candidate[], value: number): Candidate {
  return options[Math.floor(value * options.length)] as Candidate; // index < length
}

/** Cumulative sum of the weights, in name order. */
function pickWeighted(options: readonly Candidate[], tier: number, value: number): Candidate {
  let total = 0;
  for (const c of options) total += chunkWeight(tier, c.difficulty);
  let target = value * total;
  for (const c of options) {
    target -= chunkWeight(tier, c.difficulty);
    if (target < 0) return c;
  }
  return options[options.length - 1] as Candidate; // rounding guard; options is not empty
}

/** Chunks side by side; the two columns of every join get their edges redrawn. */
function join(maps: readonly TmjMap[]): TmjMap {
  const width = maps.reduce((sum, m) => sum + m.width, 0);
  const terrain = new Array<number>(width * MAP_HEIGHT).fill(0);
  const decor = new Array<number>(width * MAP_HEIGHT).fill(0);
  const joins: number[] = [];
  let offset = 0;
  for (const m of maps) {
    for (let row = 0; row < MAP_HEIGHT; row += 1) {
      for (let col = 0; col < m.width; col += 1) {
        terrain[row * width + offset + col] = m.terrain[row * m.width + col] ?? 0;
        decor[row * width + offset + col] = m.decor[row * m.width + col] ?? 0;
      }
    }
    if (offset > 0) joins.push(offset - 1, offset);
    offset += m.width;
  }
  for (const col of joins) {
    for (let row = 0; row < MAP_HEIGHT; row += 1) {
      const index = row * width + col;
      const family = EDGE_FAMILIES.find((f) => f.includes(terrain[index] ?? 0));
      if (family === undefined) continue;
      // The edge of the map counts as ground that goes on (levels/README.md).
      const filled = (c: number): boolean =>
        c < 0 || c >= width || isSolid(terrain[row * width + c] ?? 0);
      const left = filled(col - 1);
      const right = filled(col + 1);
      const variant = !left && !right ? 0 : !left ? 1 : !right ? 3 : 2;
      terrain[index] = family[variant] as number; // variant 0 to 3
    }
  }
  return { kind: "generated", width, height: MAP_HEIGHT, terrain, decor, spawns: [], chunk: null };
}

const ENEMY_TYPES: ReadonlySet<string> = new Set(["walker", "flyer", "spiky", "flyer-v"]);

/** Spawns of the level: tier filters, then the enemy density, then ids 1 to N (ADR 0013). */
function activeSpawns(
  chunks: readonly Candidate[],
  levelNumber: number,
  tier: number,
  random: () => number,
): Spawn[] {
  const kept: Spawn[] = [];
  let offset = 0;
  for (const { map } of chunks) {
    for (const spawn of [...map.spawns].sort((a, b) => a.id - b.id)) {
      if (spawn.minTier !== undefined && spawn.minTier > tier) continue;
      if (spawn.type === "flyer" && tier < FLYER_MIN_TIER) continue;
      if (spawn.type === "spiky" && tier < SPIKY_MIN_TIER) continue;
      if (spawn.type === "flyer-v" && tier < FLYER_V_MIN_TIER) continue;
      const x = spawn.x + offset * TILE_SIZE;
      kept.push({
        id: 0,
        type: spawn.type,
        x,
        y: spawn.y,
        col: spawn.col + offset,
        row: spawn.row,
      });
    }
    offset += map.width;
  }

  const enemies = kept.filter((s) => ENEMY_TYPES.has(s.type));
  const active = Math.floor(enemyDensity(levelNumber) * enemies.length + 0.5);
  // Partial Fisher–Yates over the enemies in level order.
  const order = enemies.map((_, i) => i);
  for (let i = 0; i < active; i += 1) {
    const j = i + Math.floor(random() * (order.length - i));
    [order[i], order[j]] = [order[j] as number, order[i] as number]; // i, j < length
  }
  const on = new Set(order.slice(0, active).map((i) => enemies[i]));

  // The secret item: no eligible one, none; one, it stays without using a value; more, one
  // value picks among them in level order (plan 1g2, decision 6). After the enemies, so it
  // never changes which of them are active.
  const secrets = kept.filter((s) => s.type === "secret");
  const secret = secrets.length <= 1 ? secrets[0] : secrets[Math.floor(random() * secrets.length)];

  const spawns = kept.filter(
    (s) => (!ENEMY_TYPES.has(s.type) || on.has(s)) && (s.type !== "secret" || s === secret),
  );
  spawns.forEach((s, index) => {
    s.id = index + 1;
  });
  return spawns;
}
