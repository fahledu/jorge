// Normalizes a manual level into the file the game loads (ADR 0005, ADR 0012): Tiled JSON
// with the tileset embedded and the level properties, in a canonical serialization so the
// same source always gives the same bytes and the same `contentHash`.
import * as z from "zod/mini";
import { MAP_HEIGHT, TILE_SIZE, type TmjMap } from "./tmj.ts";
import type { TilesetInfo } from "./tsx.ts";

export const LEVEL_COUNT = 100;
const LEVELS_PER_TIER = 10;
/** Tiles per second the target time assumes (ADR 0006). */
const TILES_PER_SECOND = 4;
const HASH_LENGTH = 16;
/** Written in every output, whatever the Tiled version that saved the source. */
const FORMAT_VERSION = "1.10";
const TILED_VERSION = "1.10.2";

/** Difficulty block of a level: 1 for levels 1–10, 10 for 91–100 (ADR 0005). */
export function tierOf(levelNumber: number): number {
  return Math.ceil(levelNumber / LEVELS_PER_TIER);
}

/** Target time of ADR 0006: one second per 4 tiles, rounded up. */
export function targetTimeSeconds(widthInTiles: number): number {
  return Math.ceil(widthInTiles / TILES_PER_SECOND);
}

export interface ManualLevelInput {
  levelNumber: number;
  /** Path of the .tmj relative to `levels/`, with forward slashes. */
  source: string;
  map: TmjMap;
  tileset: TilesetInfo;
  /** Path of the sheet relative to the output folder, so Tiled opens the output too. */
  imagePath: string;
  /** SHA-256 as lowercase hex; injected, the domain does not import node:crypto. */
  sha256: (text: string) => string;
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

/** Builds `levels/generated/NNN.json` from a validated manual level. */
export function buildManualLevel(input: ManualLevelInput): BuiltLevel {
  const { levelNumber, map, tileset } = input;
  if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > LEVEL_COUNT) {
    throw new Error(`level number must be 1 to ${LEVEL_COUNT}, got ${levelNumber}`);
  }

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
  const levelProperties = (hash?: string): Json[] => [
    ...(hash === undefined ? [] : [property("contentHash", hash)]),
    property("levelNumber", levelNumber),
    property("source", input.source),
    property("targetTimeSeconds", targetTimeSeconds(map.width)),
    property("tier", tierOf(levelNumber)),
  ];

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

const pointSchema = z.object({ type: z.string(), x: z.number(), y: z.number() });
const levelFileSchema = z.object({
  width: z.int(),
  properties: z.array(z.object({ name: z.string(), value: z.unknown() })),
  layers: z.array(z.object({ name: z.string(), objects: z.optional(z.array(pointSchema)) })),
  tilesets: z.tuple([z.object({ name: z.string() })]),
});

export interface LevelInfo {
  levelNumber: number;
  widthInTiles: number;
  /** Name of the embedded tileset, which the scene binds to the sheet's texture. */
  tilesetName: string;
  start: { x: number; y: number };
  flag: { x: number; y: number };
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
  const objects = layers.find((l) => l.name === "spawns")?.objects ?? [];
  const point = (type: string): { x: number; y: number } => {
    const found = objects.find((o) => o.type === type);
    if (!found) throw new Error(`level ${levelNumber} has no "${type}" spawn`);
    return { x: found.x, y: found.y };
  };
  return {
    levelNumber,
    widthInTiles: width,
    tilesetName: tilesets[0].name,
    start: point("start"),
    flag: point("flag"),
  };
}
