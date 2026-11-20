// Normalizes a manual or generated level into the file the game loads (ADR 0012, ADR 0013):
// Tiled JSON with the tileset embedded and the level properties, in a canonical serialization so the
// same source always gives the same bytes and the same `contentHash`.
import * as z from "zod/mini";
import { LEVEL_COUNT, tierOf } from "./curve.ts";
import { type EnemyType, isSolid, type PatrolRange, patrolRange } from "./enemies.ts";
import { type Cell, cellOf, cellsWith, pitColumns } from "./geometry.ts";
import { gidOf, SPIKE_TILES } from "./tiles.ts";
import { MAP_HEIGHT, TILE_SIZE, type TmjMap } from "./tmj.ts";
import type { TilesetInfo } from "./tsx.ts";

export { LEVEL_COUNT, tierOf };
/** Goes up with every change of the generator that changes its output (ADR 0013). */
export const GENERATOR_VERSION = 1;

/** Tiles per second the target time assumes (ADR 0006). */
const TILES_PER_SECOND = 4;
const HASH_LENGTH = 16;
/** Written in every output, whatever the Tiled version that saved the source. */
const FORMAT_VERSION = "1.10";
const TILED_VERSION = "1.10.2";

/** Target time of ADR 0006: one second per 4 tiles, rounded up. */
export function targetTimeSeconds(widthInTiles: number): number {
  return Math.ceil(widthInTiles / TILES_PER_SECOND);
}

interface LevelFileInput {
  map: TmjMap;
  tileset: TilesetInfo;
  /** Path of the sheet relative to the output folder, so Tiled opens the output too. */
  imagePath: string;
  /** SHA-256 as lowercase hex; injected, the domain does not import node:crypto. */
  sha256: (text: string) => string;
}

export interface ManualLevelInput extends LevelFileInput {
  levelNumber: number;
  /** Path of the .tmj relative to `levels/`, with forward slashes. */
  source: string;
}

export interface GeneratedLevelInput extends LevelFileInput {
  levelNumber: number;
  seed: number;
  /** Names of the chunks, in level order (ADR 0013). */
  chunks: readonly string[];
}

export interface BuiltLevel {
  json: string;
  contentHash: string;
}

type Json = string | number | boolean | Json[] | { [key: string]: Json };

/** Two-space JSON; `data` arrays get one map row per line so diffs stay readable. */
function serialize(value: Json, width: number, indent = "", key = ""): string {
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (key === "data") {
      const rows: string[] = [];
      for (let start = 0; start < value.length; start += width) {
        rows.push(inner + value.slice(start, start + width).join(","));
      }
      return `[\n${rows.join(",\n")}\n${indent}]`;
    }
    const items = value.map((item) => inner + serialize(item, width, inner));
    return `[\n${items.join(",\n")}\n${indent}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value).map(
      ([k, v]) => `${inner}${JSON.stringify(k)}: ${serialize(v, width, inner, k)}`,
    );
    return entries.length === 0 ? "{}" : `{\n${entries.join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}

function property(name: string, value: string | number): Json {
  return { name, type: typeof value === "number" ? "int" : "string", value };
}

function checkLevelNumber(levelNumber: number): void {
  if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > LEVEL_COUNT) {
    throw new Error(`level number must be 1 to ${LEVEL_COUNT}, got ${levelNumber}`);
  }
}

/** Builds `levels/generated/NNN.json` from a validated manual level. */
export function buildManualLevel(input: ManualLevelInput): BuiltLevel {
  const { levelNumber, source, map } = input;
  checkLevelNumber(levelNumber);
  return buildLevelFile(input, [
    ["levelNumber", levelNumber],
    ["source", source],
    ["targetTimeSeconds", targetTimeSeconds(map.width)],
    ["tier", tierOf(levelNumber)],
  ]);
}

/** Builds `levels/generated/NNN.json` from the map the generator assembled (ADR 0013). */
export function buildGeneratedLevel(input: GeneratedLevelInput): BuiltLevel {
  const { levelNumber, seed, chunks, map } = input;
  checkLevelNumber(levelNumber);
  return buildLevelFile(input, [
    ["chunks", chunks.join(",")],
    ["generatorVersion", GENERATOR_VERSION],
    ["levelNumber", levelNumber],
    ["seed", seed],
    ["targetTimeSeconds", targetTimeSeconds(map.width)],
    ["tier", tierOf(levelNumber)],
  ]);
}

/** The canonical file: `contentHash` is the hash of the same file without it. */
function buildLevelFile(
  input: LevelFileInput,
  properties: readonly [string, string | number][],
): BuiltLevel {
  const { map, tileset } = input;

  const spawns = [...map.spawns].sort((a, b) => a.id - b.id);
  const objects: Json[] = spawns.map((spawn) => {
    // Keys in Tiled's alphabetical order; `properties` only when there is one.
    const object: { [key: string]: Json } = { height: 0, id: spawn.id, name: "", point: true };
    if (spawn.minTier !== undefined) object.properties = [property("minTier", spawn.minTier)];
    Object.assign(object, { rotation: 0, type: spawn.type, visible: true, width: 0 });
    Object.assign(object, { x: spawn.x, y: spawn.y });
    return object;
  });
  const nextObjectId = spawns.reduce((max, spawn) => Math.max(max, spawn.id), 0) + 1;

  const tileLayer = (id: number, name: string, data: number[]): Json => ({
    data,
    height: MAP_HEIGHT,
    id,
    name,
    opacity: 1,
    type: "tilelayer",
    visible: true,
    width: map.width,
    x: 0,
    y: 0,
  });

  // Properties in name order (ADR 0012); contentHash is added after hashing the rest.
  const levelProperties = (hash?: string): Json[] =>
    [...properties, ...(hash === undefined ? [] : [["contentHash", hash] as const])]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([name, value]) => property(name, value));

  const levelFile = (hash?: string): Json => ({
    compressionlevel: -1,
    height: MAP_HEIGHT,
    infinite: false,
    layers: [
      tileLayer(1, "terrain", map.terrain),
      tileLayer(2, "decor", map.decor),
      {
        draworder: "topdown",
        id: 3,
        name: "spawns",
        objects,
        opacity: 1,
        type: "objectgroup",
        visible: true,
        x: 0,
        y: 0,
      },
    ],
    nextlayerid: 4,
    nextobjectid: nextObjectId,
    orientation: "orthogonal",
    properties: levelProperties(hash),
    renderorder: "right-down",
    tiledversion: TILED_VERSION,
    tileheight: TILE_SIZE,
    tilesets: [
      {
        columns: tileset.columns,
        firstgid: 1,
        image: input.imagePath,
        imageheight: tileset.imageheight,
        imagewidth: tileset.imagewidth,
        margin: tileset.margin,
        name: tileset.name,
        spacing: tileset.spacing,
        tilecount: tileset.tilecount,
        tileheight: tileset.tileheight,
        tilewidth: tileset.tilewidth,
      },
    ],
    tilewidth: TILE_SIZE,
    type: "map",
    version: FORMAT_VERSION,
    width: map.width,
  });

  const contentHash = input.sha256(`${serialize(levelFile(), map.width)}\n`).slice(0, HASH_LENGTH);
  return { json: `${serialize(levelFile(contentHash), map.width)}\n`, contentHash };
}

const pointSchema = z.object({ id: z.int(), type: z.string(), x: z.number(), y: z.number() });
const levelFileSchema = z.object({
  width: z.int(),
  properties: z.array(z.object({ name: z.string(), value: z.unknown() })),
  layers: z.array(
    z.object({
      name: z.string(),
      objects: z.optional(z.array(pointSchema)),
      data: z.optional(z.array(z.int())),
    }),
  ),
  tilesets: z.tuple([z.object({ name: z.string() })]),
});

export interface LevelInfo {
  levelNumber: number;
  widthInTiles: number;
  /** Time for the full bonus, written by the build (ADR 0006). */
  targetTimeSeconds: number;
  /** Name of the embedded tileset, which the scene binds to the sheet's texture. */
  tilesetName: string;
  start: { x: number; y: number };
  flag: { x: number; y: number };
  /** Coins, hearts and springs, at their spawn points (centre of a cell). */
  items: LevelItem[];
  /** Cells of the terrain holding a spike. */
  spikes: Cell[];
  /** Walkers and flyers with their patrol range (plan 1e). */
  enemies: LevelEnemy[];
  /** Columns with no terrain tile at all: a pit open to the bottom. */
  pits: number[];
  /** First solid row below the start, where the background hills sit (plan 1g, decision 4). */
  groundRow: number;
}

export interface LevelEnemy {
  /** Id of the spawn in the file: one enemy is defeated once per attempt. */
  id: number;
  type: EnemyType;
  /** Spawn point, centre of a cell. */
  x: number;
  y: number;
  row: number;
  range: PatrolRange;
}

export type ItemType = "coin" | "heart" | "spring";

export interface LevelItem {
  /** Id of the spawn in the file: one coin or heart is collected once per attempt. */
  id: number;
  type: ItemType;
  x: number;
  y: number;
}

const ITEM_TYPES: readonly string[] = ["coin", "heart", "spring"] satisfies ItemType[];

function isItemType(type: string): type is ItemType {
  return ITEM_TYPES.includes(type);
}

function isEnemyType(type: string): type is EnemyType {
  return type === "walker" || type === "flyer";
}

/** First solid row at or below a point; the last row if the column has none. */
function groundBelow(
  terrain: readonly number[],
  width: number,
  point: { x: number; y: number },
): number {
  const { col, row } = cellOf(point);
  for (let r = Math.max(0, row); r < MAP_HEIGHT; r += 1) {
    if (isSolid(terrain[r * width + col] ?? 0)) return r;
  }
  return MAP_HEIGHT - 1;
}

/**
 * What the game needs from a generated level, checked at the border: the file comes from
 * the build, but a stale tab may load a file from another version (ADR 0011). Only the shape
 * is checked here; the rules of the content (spawns inside the map...) are the build's.
 */
export function readLevelInfo(json: unknown): LevelInfo {
  const parsed = levelFileSchema.safeParse(json);
  if (!parsed.success) throw new Error("level file does not have the generated format");
  const { width, properties, layers, tilesets } = parsed.data;
  const levelNumber = properties.find((p) => p.name === "levelNumber")?.value;
  if (typeof levelNumber !== "number") throw new Error("level file has no levelNumber");
  const target = properties.find((p) => p.name === "targetTimeSeconds")?.value;
  if (typeof target !== "number") throw new Error("level file has no targetTimeSeconds");
  const objects = layers.find((l) => l.name === "spawns")?.objects ?? [];
  const terrain = layers.find((l) => l.name === "terrain")?.data ?? [];
  const point = (type: string): { x: number; y: number } => {
    const found = objects.find((o) => o.type === type);
    if (!found) throw new Error(`level ${levelNumber} has no "${type}" spawn`);
    return { x: found.x, y: found.y };
  };
  const start = point("start");
  return {
    levelNumber,
    widthInTiles: width,
    targetTimeSeconds: target,
    tilesetName: tilesets[0].name,
    start,
    flag: point("flag"),
    items: objects.flatMap((o) =>
      isItemType(o.type) ? [{ id: o.id, type: o.type, x: o.x, y: o.y }] : [],
    ),
    spikes: cellsWith(terrain, width, SPIKE_TILES.map(gidOf)),
    enemies: objects.flatMap((o) => {
      if (!isEnemyType(o.type)) return [];
      const cell = cellOf(o);
      const range = patrolRange(o.type, cell, terrain, width);
      return [{ id: o.id, type: o.type, x: o.x, y: o.y, row: cell.row, range }];
    }),
    pits: pitColumns(terrain, width),
    groundRow: groundBelow(terrain, width, start),
  };
}
