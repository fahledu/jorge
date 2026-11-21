// Reader of chunks and manual levels written in the subset of the Tiled JSON accepted by
// ADR 0012 (layers and properties from ADR 0013). Every problem comes back with the file,
// the layer and the cell, so a wrong file written by an agent is caught by the build.
import * as z from "zod/mini";
import { BASE_PALETTE, gidOf, SPIKE_TILES } from "./tiles.ts";
import type { TilesetInfo } from "./tsx.ts";

const SPIKE_GIDS: readonly number[] = SPIKE_TILES.map(gidOf);

/** Tile size in game pixels (ADR 0013). */
export const TILE_SIZE = 18;
/** Every chunk and level is 15 tiles high (ADR 0013). */
export const MAP_HEIGHT = 15;
/** The only tileset a map may use, relative to the repository root (ADR 0012). */
export const TILESET_PATH = "assets/kenney/Tiled/tileset-tiles.tsx";

export const SPAWN_TYPES = [
  "start",
  "flag",
  "walker",
  "flyer",
  "spiky",
  "flyer-v",
  "coin",
  "heart",
  "spring",
  "secret",
] as const;
export type SpawnType = (typeof SPAWN_TYPES)[number];
/** Spawns that may carry `minTier` (ADR 0012). */
const TIERED_SPAWNS: ReadonlySet<SpawnType> = new Set([
  "walker",
  "flyer",
  "spiky",
  "flyer-v",
  "coin",
  "heart",
  "spring",
  "secret",
]);

const CHUNK_WIDTH = { min: 16, max: 48 };
const MANUAL_WIDTH = { min: 27, max: 300 };
const MAX_TIER = 10;
/** Flip and rotation bits of a Tiled GID. */
const FLIP_BITS = 0xf0000000;
/** Caps the list so a broken file does not print thousands of lines. */
const MAX_ERRORS = 50;

/** `generated`: assembled by the generator, never read from a file (ADR 0013). */
export type MapKind = "manual" | "chunk" | "generated";
/** Kinds read from a .tmj file. */
export type FileKind = Exclude<MapKind, "generated">;

export interface TmjError {
  file: string;
  layer?: string;
  col?: number;
  row?: number;
  message: string;
}

export interface Spawn {
  id: number;
  type: SpawnType;
  x: number;
  y: number;
  col: number;
  row: number;
  minTier?: number;
}

export interface ChunkProperties {
  difficulty: number;
  entryRow: number;
  exitRow: number;
  tags: string[];
}

export interface TmjMap {
  kind: MapKind;
  width: number;
  height: number;
  terrain: number[];
  decor: number[];
  spawns: Spawn[];
  /** Chunk properties of ADR 0013; `null` for a manual level, which has none. */
  chunk: ChunkProperties | null;
}

export type TmjResult = { ok: true; map: TmjMap } | { ok: false; errors: TmjError[] };

export interface ParseOptions {
  kind: FileKind;
  /** Path of the file relative to the repository root, with forward slashes. */
  file: string;
  tileset: TilesetInfo;
}

const propertySchema = z.strictObject({ name: z.string(), type: z.string(), value: z.unknown() });
type Property = z.infer<typeof propertySchema>;

const mapSchema = z.strictObject({
  compressionlevel: z.literal(-1),
  height: z.literal(MAP_HEIGHT),
  infinite: z.literal(false),
  layers: z.array(z.unknown()),
  nextlayerid: z.int(),
  nextobjectid: z.int(),
  orientation: z.literal("orthogonal"),
  properties: z.optional(z.array(propertySchema)),
  renderorder: z.literal("right-down"),
  tiledversion: z.string(),
  tileheight: z.literal(TILE_SIZE),
  tilesets: z.array(z.strictObject({ firstgid: z.literal(1), source: z.string() })),
  tilewidth: z.literal(TILE_SIZE),
  type: z.literal("map"),
  version: z.string(),
  width: z.int(),
});

const tileLayerSchema = z.strictObject({
  data: z.array(z.number()),
  height: z.literal(MAP_HEIGHT),
  id: z.int(),
  name: z.string(),
  opacity: z.literal(1),
  type: z.literal("tilelayer"),
  visible: z.literal(true),
  width: z.int(),
  x: z.literal(0),
  y: z.literal(0),
});

const pointSchema = z.strictObject({
  height: z.literal(0),
  id: z.int(),
  name: z.string(),
  point: z.literal(true),
  properties: z.optional(z.array(propertySchema)),
  rotation: z.literal(0),
  type: z.string(),
  visible: z.literal(true),
  width: z.literal(0),
  x: z.number(),
  y: z.number(),
});

const objectLayerSchema = z.strictObject({
  draworder: z.literal("topdown"),
  id: z.int(),
  name: z.string(),
  objects: z.array(pointSchema),
  opacity: z.literal(1),
  type: z.literal("objectgroup"),
  visible: z.literal(true),
  x: z.literal(0),
  y: z.literal(0),
});

const LAYERS = [
  { name: "terrain", schema: tileLayerSchema },
  { name: "decor", schema: tileLayerSchema },
  { name: "spawns", schema: objectLayerSchema },
] as const;

/** Resolves `relative` against the folder of `file`, both with forward slashes. */
function resolvePath(file: string, relative: string): string {
  const parts = file.split("/").slice(0, -1);
  for (const part of relative.split("/")) {
    if (part === "..") parts.pop();
    else if (part !== "." && part !== "") parts.push(part);
  }
  return parts.join("/");
}

function issuesOf(error: z.core.$ZodError): string[] {
  // zod/mini ships no messages ("Invalid input"), so the text comes from the issue code.
  return error.issues.map((issue) => {
    let message: string;
    if (issue.code === "unrecognized_keys") message = `unknown field(s) ${issue.keys.join(", ")}`;
    else if (issue.code === "invalid_value") {
      message = `must be ${issue.values.map((v) => JSON.stringify(v)).join(" or ")}`;
    } else if (issue.code === "invalid_type") message = `must be ${issue.expected}`;
    else message = issue.message;
    const where = issue.path.map(String).join(".");
    return where ? `${where}: ${message}` : message;
  });
}

/** Reads one integer property, collecting the problem instead of throwing. */
function intProperty(
  props: Map<string, Property>,
  name: string,
  range: { min: number; max: number },
  fail: (message: string) => void,
): number {
  const prop = props.get(name);
  if (!prop) {
    fail(`missing map property "${name}"`);
    return range.min;
  }
  const { type, value } = prop;
  if (type !== "int" || typeof value !== "number" || !Number.isInteger(value)) {
    fail(`map property "${name}" must be an int`);
    return range.min;
  }
  if (value < range.min || value > range.max) {
    fail(`map property "${name}" must be between ${range.min} and ${range.max}, got ${value}`);
  }
  return value;
}

/** Validates a parsed .tmj (JSON already decoded) against ADR 0013 and ADR 0012. */
export function parseTmj(json: unknown, opts: ParseOptions): TmjResult {
  const { file, kind, tileset } = opts;
  const errors: TmjError[] = [];
  const fail = (message: string, where: Omit<TmjError, "file" | "message"> = {}): void => {
    if (errors.length < MAX_ERRORS) errors.push({ file, ...where, message });
  };

  const parsed = mapSchema.safeParse(json);
  if (!parsed.success) {
    for (const message of issuesOf(parsed.error)) fail(message);
    return { ok: false, errors };
  }
  const map = parsed.data;
  const { width } = map;

  // Format version: the 1.x line from 1.10 on (ADR 0012).
  const minor = /^1\.(\d+)$/.exec(map.version)?.[1];
  if (minor === undefined || Number(minor) < 10) {
    fail(`version must be "1.10" or later in the 1.x line, got "${map.version}"`);
  }

  const widthRange = kind === "chunk" ? CHUNK_WIDTH : MANUAL_WIDTH;
  if (width < widthRange.min || width > widthRange.max) {
    fail(
      `width of a ${kind} must be between ${widthRange.min} and ${widthRange.max}, got ${width}`,
    );
  }

  if (map.tilesets.length !== 1) fail(`exactly one tileset expected, got ${map.tilesets.length}`);
  for (const entry of map.tilesets) {
    const target = resolvePath(file, entry.source);
    if (target !== TILESET_PATH) fail(`tileset must be ${TILESET_PATH}, got ${target}`);
  }

  // Layers: exactly terrain, decor and spawns, in this order.
  if (map.layers.length !== LAYERS.length) {
    fail(`layers must be ${LAYERS.map((l) => l.name).join(", ")}; got ${map.layers.length}`);
  }
  const layerIds = new Set<number>();
  const tileData: number[][] = [];
  const objects: z.infer<typeof pointSchema>[] = [];
  function checkTiles(name: string, layerWidth: number, data: number[]): void {
    if (layerWidth !== width)
      fail(`width ${layerWidth} differs from the map (${width})`, { layer: name });
    if (data.length !== width * MAP_HEIGHT) {
      fail(`data has ${data.length} items, expected ${width * MAP_HEIGHT}`, { layer: name });
      return;
    }
    data.forEach((gid, index) => {
      const where = { layer: name, col: index % width, row: Math.floor(index / width) };
      if (!Number.isInteger(gid) || gid < 0) fail(`invalid GID ${gid}`, where);
      else if ((gid & FLIP_BITS) !== 0) fail(`GID ${gid} has flip or rotation bits`, where);
      else if (gid > tileset.tilecount) {
        fail(`GID ${gid} is outside the tileset (1 to ${tileset.tilecount})`, where);
      } else if (gid !== 0 && !BASE_PALETTE.has(gid)) {
        // Chunks and manual levels draw with the meadow; the build swaps the tiles (ADR 0015).
        fail(`GID ${gid} is outside the base palette (levels/README.md)`, where);
      }
    });
  }

  LAYERS.forEach((expected, index) => {
    const raw = map.layers[index];
    if (raw === undefined) {
      fail(`missing layer "${expected.name}"`, { layer: expected.name });
      return;
    }
    const layerResult = expected.schema.safeParse(raw);
    if (!layerResult.success) {
      for (const message of issuesOf(layerResult.error)) fail(message, { layer: expected.name });
      return;
    }
    const layer = layerResult.data;
    if (layer.name !== expected.name) {
      fail(`layer ${index + 1} must be "${expected.name}", got "${layer.name}"`, {
        layer: layer.name,
      });
    }
    if (layerIds.has(layer.id) || layer.id >= map.nextlayerid) {
      fail(`layer id ${layer.id} must be unique and below nextlayerid`, { layer: layer.name });
    }
    layerIds.add(layer.id);
    if ("data" in layer) {
      checkTiles(layer.name, layer.width, layer.data);
      tileData.push(layer.data);
    } else {
      objects.push(...layer.objects);
    }
  });

  // Map properties: none on a manual level; the ADR 0013 set on a chunk.
  const props = new Map<string, Property>();
  for (const prop of map.properties ?? []) {
    if (props.has(prop.name)) fail(`map property "${prop.name}" appears twice`);
    props.set(prop.name, prop);
  }
  let chunk: ChunkProperties | null = null;
  if (kind === "manual") {
    for (const name of props.keys()) fail(`a manual level has no map properties; got "${name}"`);
  } else {
    const known = new Set(["difficulty", "entryRow", "exitRow", "tags"]);
    for (const name of props.keys()) {
      if (!known.has(name)) fail(`unknown map property "${name}"`);
    }
    const rows = { min: 0, max: MAP_HEIGHT - 1 };
    const tagsProp = props.get("tags");
    let tags: string[] = [];
    if (tagsProp) {
      if (tagsProp.type !== "string" || typeof tagsProp.value !== "string") {
        fail('map property "tags" must be a string');
      } else {
        tags = tagsProp.value
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag !== "");
      }
    }
    chunk = {
      difficulty: intProperty(props, "difficulty", { min: 1, max: MAX_TIER }, fail),
      entryRow: intProperty(props, "entryRow", rows, fail),
      exitRow: intProperty(props, "exitRow", rows, fail),
      tags,
    };
  }

  const spawns = readSpawns(objects, map.nextobjectid, width, fail);

  // Start and flag: one of each on a manual level; on a chunk only with the matching tag.
  const count = (type: SpawnType): number => spawns.filter((s) => s.type === type).length;
  const expectations: [SpawnType, number][] =
    chunk === null
      ? [
          ["start", 1],
          ["flag", 1],
        ]
      : [
          ["start", chunk.tags.includes("start") ? 1 : 0],
          ["flag", chunk.tags.includes("finish") ? 1 : 0],
        ];
  for (const [type, expected] of expectations) {
    const found = count(type);
    if (found !== expected) {
      fail(`expected ${expected} "${type}" spawn(s), found ${found}`, { layer: "spawns" });
    }
  }

  const [terrain, decor] = tileData;
  if (terrain && terrain.length === width * MAP_HEIGHT) {
    checkEnemySpawns(spawns, terrain, width, fail);
  }
  if (errors.length > 0 || !terrain || !decor) return { ok: false, errors };
  return { ok: true, map: { kind, width, height: MAP_HEIGHT, terrain, decor, spawns, chunk } };
}

function readSpawns(
  objects: z.infer<typeof pointSchema>[],
  nextObjectId: number,
  width: number,
  fail: (message: string, where?: Omit<TmjError, "file" | "message">) => void,
): Spawn[] {
  const spawns: Spawn[] = [];
  const ids = new Set<number>();
  const types: ReadonlySet<string> = new Set(SPAWN_TYPES);
  for (const object of objects) {
    const { x, y, id } = object;
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    const where = { layer: "spawns", col, row };
    if (ids.has(id) || id >= nextObjectId) {
      fail(`object id ${id} must be unique and below nextobjectid`, where);
    }
    ids.add(id);
    if (x < 0 || y < 0 || x >= width * TILE_SIZE || y >= MAP_HEIGHT * TILE_SIZE) {
      fail(`object ${id} at (${x}, ${y}) is outside the map`, where);
      continue;
    }
    if (!types.has(object.type)) {
      fail(`unknown spawn type "${object.type}" (object ${id})`, where);
      continue;
    }
    const type = object.type as SpawnType; // checked against SPAWN_TYPES just above
    const spawn: Spawn = { id, type, x, y, col, row };
    for (const prop of object.properties ?? []) {
      if (prop.name !== "minTier") {
        fail(`unknown property "${prop.name}" on object ${id}`, where);
      } else if (!TIERED_SPAWNS.has(type)) {
        fail(`"minTier" is not allowed on a "${type}" spawn (object ${id})`, where);
      } else if (
        prop.type !== "int" ||
        typeof prop.value !== "number" ||
        !Number.isInteger(prop.value) ||
        prop.value < 1 ||
        prop.value > MAX_TIER
      ) {
        fail(`"minTier" must be an int from 1 to ${MAX_TIER} (object ${id})`, where);
      } else {
        spawn.minTier = prop.value;
      }
    }
    spawns.push(spawn);
  }
  return spawns;
}

/**
 * An enemy may not start inside the terrain (solid or spike), and a walker or a spiky needs
 * solid ground below, or it would float still (ADR 0012).
 */
const ENEMY_SPAWNS: ReadonlySet<SpawnType> = new Set(["walker", "flyer", "spiky", "flyer-v"]);

function checkEnemySpawns(
  spawns: readonly Spawn[],
  terrain: readonly number[],
  width: number,
  fail: (message: string, where?: Omit<TmjError, "file" | "message">) => void,
): void {
  const gidAt = (col: number, row: number): number =>
    row < MAP_HEIGHT ? (terrain[row * width + col] ?? 0) : 0;
  const isSolid = (gid: number): boolean => gid !== 0 && !SPIKE_GIDS.includes(gid);
  for (const spawn of spawns) {
    if (!ENEMY_SPAWNS.has(spawn.type)) continue;
    const where = { layer: "spawns", col: spawn.col, row: spawn.row };
    if (gidAt(spawn.col, spawn.row) !== 0) {
      fail(`"${spawn.type}" spawn ${spawn.id} is inside the terrain`, where);
    } else if (
      (spawn.type === "walker" || spawn.type === "spiky") &&
      !isSolid(gidAt(spawn.col, spawn.row + 1))
    ) {
      fail(`"${spawn.type}" spawn ${spawn.id} has no solid ground below`, where);
    }
  }
}

/** One line per error, for the build output. */
export function formatTmjError(error: TmjError): string {
  const layer = error.layer ? ` [${error.layer}]` : "";
  const cell = error.col !== undefined ? ` (col ${error.col}, row ${error.row})` : "";
  return `${error.file}${layer}${cell}: ${error.message}`;
}
