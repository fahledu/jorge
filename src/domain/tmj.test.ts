import { describe, expect, it } from "vitest";
import { chunkProps, type FixtureSpawn, makeMap, TILESET } from "./fixtures/maps.ts";
import { formatTmjError, type MapKind, parseTmj, type TmjError } from "./tmj.ts";

const MANUAL_FILE = "levels/manual/001.tmj";
const CHUNK_FILE = "levels/chunks/flat.tmj";

function parse(json: unknown, kind: MapKind = "manual") {
  return parseTmj(json, {
    kind,
    file: kind === "manual" ? MANUAL_FILE : CHUNK_FILE,
    tileset: TILESET,
  });
}

function errorsOf(json: unknown, kind: MapKind = "manual"): TmjError[] {
  const result = parse(json, kind);
  if (result.ok) throw new Error("expected the map to be rejected");
  return result.errors;
}

const messages = (json: unknown, kind: MapKind = "manual"): string =>
  errorsOf(json, kind)
    .map((e) => e.message)
    .join("\n");

type MapJson = ReturnType<typeof makeMap>;
const layer = (map: MapJson, index: number) =>
  (map.layers as Record<string, unknown>[])[index] as Record<string, unknown>;
const terrainOf = (map: MapJson) => layer(map, 0).data as number[];

const chunkSpawns: FixtureSpawn[] = [{ type: "coin", x: 45, y: 189 }];

describe("parseTmj: valid maps", () => {
  it("reads a manual level 27 wide", () => {
    const result = parse(makeMap(27));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.map.width).toBe(27);
    expect(result.map.terrain).toHaveLength(27 * 15);
    expect(result.map.chunk).toBeNull();
    expect(result.map.spawns.map((s) => s.type)).toEqual(["start", "flag"]);
  });

  it("places a spawn at x 9, y 225 in column 0, row 12", () => {
    const map = makeMap(27, {
      spawns: [
        { type: "start", x: 9, y: 225 },
        { type: "flag", x: 400, y: 207 },
      ],
    });
    const result = parse(map);
    expect(result.ok && result.map.spawns[0]).toMatchObject({ col: 0, row: 12 });
  });

  it("accepts a manual level 300 wide and a format version 1.11", () => {
    expect(parse(makeMap(300)).ok).toBe(true);
    expect(parse({ ...makeMap(27), version: "1.11" }).ok).toBe(true);
  });

  it.each([16, 48])("accepts a chunk %i wide", (width) => {
    const result = parse(
      makeMap(width, { spawns: chunkSpawns, properties: chunkProps() }),
      "chunk",
    );
    expect(result.ok).toBe(true);
  });

  it("reads chunk properties, tags and minTier", () => {
    const map = makeMap(16, {
      spawns: [
        { type: "start", x: 9, y: 207 },
        {
          type: "walker",
          x: 99,
          y: 207,
          properties: [{ name: "minTier", type: "int", value: 3 }],
        },
      ],
      properties: chunkProps(4, [{ name: "tags", type: "string", value: "start, easy" }]),
    });
    const result = parse(map, "chunk");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.map.chunk).toEqual({
      difficulty: 4,
      entryRow: 12,
      exitRow: 12,
      tags: ["start", "easy"],
    });
    expect(result.map.spawns[1]?.minTier).toBe(3);
  });
});

describe("parseTmj: cases of ADR 0012", () => {
  it("rejects GID 181 with the layer, column and row", () => {
    const map = makeMap(27);
    terrainOf(map)[27 * 3 + 5] = 181;
    expect(errorsOf(map)).toEqual([
      {
        file: MANUAL_FILE,
        layer: "terrain",
        col: 5,
        row: 3,
        message: "GID 181 is outside the tileset (1 to 180)",
      },
    ]);
  });

  it("rejects a GID with the flip bit", () => {
    const map = makeMap(27);
    terrainOf(map)[0] = 0x80000001;
    expect(messages(map)).toMatch(/flip/);
  });

  it("rejects a negative or fractional GID", () => {
    const map = makeMap(27);
    terrainOf(map)[0] = -1;
    terrainOf(map)[1] = 1.5;
    expect(errorsOf(map)).toHaveLength(2);
  });

  it("rejects data with 1499 items in a 100×15 map", () => {
    const map = makeMap(100);
    terrainOf(map).pop();
    expect(messages(map)).toMatch(/1499 items, expected 1500/);
  });

  it.each(["coin ", "Coin"])("rejects the spawn type %j", (type) => {
    const map = makeMap(27, {
      spawns: [
        { type: "start", x: 9, y: 207 },
        { type: "flag", x: 400, y: 207 },
        { type, x: 100, y: 100 },
      ],
    });
    expect(messages(map)).toMatch(/unknown spawn type/);
  });

  it("rejects a manual level without a flag", () => {
    const map = makeMap(27, { spawns: [{ type: "start", x: 9, y: 207 }] });
    expect(messages(map)).toMatch(/expected 1 "flag" spawn\(s\), found 0/);
  });

  describe("enemy spawns (ADR 0012)", () => {
    const withEnemy = (type: "walker" | "flyer", y: number) =>
      makeMap(27, {
        spawns: [
          { type: "start", x: 9, y: 207 },
          { type: "flag", x: 400, y: 207 },
          { type, x: 99, y },
        ],
      });

    it("accepts a walker on the ground", () => {
      expect(parse(withEnemy("walker", 207)).ok).toBe(true);
    });

    it("rejects a walker with nothing below, with column and row", () => {
      const map = withEnemy("walker", 207);
      const terrain = terrainOf(map);
      for (let row = 12; row < 15; row += 1) terrain[row * 27 + 5] = 0;
      const [error] = errorsOf(map);
      expect(error).toMatchObject({ layer: "spawns", col: 5, row: 11 });
      expect(error?.message).toMatch(/"walker" spawn \d+ has no solid ground below/);
    });

    it("rejects a walker standing on a spike", () => {
      const map = withEnemy("walker", 207);
      terrainOf(map)[12 * 27 + 5] = 69;
      expect(messages(map)).toMatch(/no solid ground below/);
    });

    it("rejects a flyer inside the terrain", () => {
      expect(messages(withEnemy("flyer", 225))).toMatch(/"flyer" spawn \d+ is inside the terrain/);
    });
  });

  it("rejects two starts", () => {
    const map = makeMap(27, {
      spawns: [
        { type: "start", x: 9, y: 207 },
        { type: "start", x: 27, y: 207 },
        { type: "flag", x: 400, y: 207 },
      ],
    });
    expect(messages(map)).toMatch(/expected 1 "start" spawn\(s\), found 2/);
  });

  it("rejects minTier 11 and minTier on a start", () => {
    const tier = (value: unknown) => [{ name: "minTier", type: "int", value }];
    const map = makeMap(27, {
      spawns: [
        { type: "start", x: 9, y: 207, properties: tier(2) },
        { type: "flag", x: 400, y: 207 },
        { type: "coin", x: 100, y: 100, properties: tier(11) },
      ],
    });
    const text = messages(map);
    expect(text).toMatch(/"minTier" is not allowed on a "start"/);
    expect(text).toMatch(/"minTier" must be an int from 1 to 10/);
  });

  it("rejects an unknown property on a spawn", () => {
    const map = makeMap(27, {
      spawns: [
        { type: "start", x: 9, y: 207, properties: [{ name: "speed", type: "int", value: 1 }] },
        { type: "flag", x: 400, y: 207 },
      ],
    });
    expect(messages(map)).toMatch(/unknown property "speed"/);
  });

  it("rejects a point at x 1800 in a map 100 tiles wide", () => {
    const map = makeMap(100, {
      spawns: [
        { type: "start", x: 9, y: 207 },
        { type: "flag", x: 1800, y: 207 },
      ],
    });
    expect(messages(map)).toMatch(/outside the map/);
  });

  it("rejects the characters tileset", () => {
    const map = {
      ...makeMap(27),
      tilesets: [{ firstgid: 1, source: "../../assets/kenney/Tiled/tileset-characters.tsx" }],
    };
    expect(messages(map)).toMatch(/tileset must be assets\/kenney\/Tiled\/tileset-tiles.tsx/);
  });

  it("rejects two tilesets", () => {
    const base = makeMap(27);
    const map = {
      ...base,
      tilesets: [...(base.tilesets as unknown[]), ...(base.tilesets as unknown[])],
    };
    expect(messages(map)).toMatch(/exactly one tileset/);
  });
});

describe("parseTmj: structure", () => {
  it("rejects a missing decor layer", () => {
    const map = makeMap(27);
    const layers = map.layers as unknown[];
    map.layers = [layers[0], layers[2]];
    const text = messages(map);
    expect(text).toMatch(/layers must be terrain, decor, spawns/);
  });

  it("names the missing layer when only terrain exists", () => {
    const map = makeMap(27);
    map.layers = [(map.layers as unknown[])[0]];
    expect(errorsOf(map).map((e) => e.layer)).toContain("spawns");
  });

  it("rejects an extra layer", () => {
    const map = makeMap(27);
    map.layers = [...(map.layers as unknown[]), layer(map, 1)];
    expect(messages(map)).toMatch(/layers must be/);
  });

  it("rejects layers out of order", () => {
    const map = makeMap(27);
    const [terrain, decor, spawns] = map.layers as unknown[];
    map.layers = [decor, terrain, spawns];
    expect(messages(map)).toMatch(/layer 1 must be "terrain", got "decor"/);
  });

  it("rejects a repeated layer id", () => {
    const map = makeMap(27);
    layer(map, 1).id = 1;
    expect(messages(map)).toMatch(/layer id 1 must be unique/);
  });

  it("rejects a repeated object id", () => {
    const map = makeMap(27);
    const objects = layer(map, 2).objects as Record<string, unknown>[];
    (objects[1] as Record<string, unknown>).id = 1;
    expect(messages(map)).toMatch(/object id 1 must be unique/);
  });

  it("rejects a tile layer whose width differs from the map", () => {
    const map = makeMap(27);
    layer(map, 1).width = 28;
    expect(messages(map)).toMatch(/width 28 differs from the map/);
  });

  it("rejects height 14 and an unknown field", () => {
    expect(messages({ ...makeMap(27), height: 14 })).toMatch(/height/);
    expect(messages({ ...makeMap(27), backgroundcolor: "#000" })).toMatch(/backgroundcolor/);
  });

  it("rejects a schema problem inside a layer, naming the layer", () => {
    const map = makeMap(27);
    layer(map, 2).draworder = "index";
    expect(errorsOf(map)[0]?.layer).toBe("spawns");
  });

  it("rejects format 1.9 and a malformed version", () => {
    expect(messages({ ...makeMap(27), version: "1.9" })).toMatch(/version/);
    expect(messages({ ...makeMap(27), version: "2.0" })).toMatch(/version/);
  });

  it.each([26, 301])("rejects a manual level %i wide", (width) => {
    expect(messages(makeMap(width))).toMatch(/width of a manual/);
  });

  it("rejects map properties on a manual level", () => {
    const map = makeMap(27, { properties: chunkProps() });
    expect(messages(map)).toMatch(/a manual level has no map properties/);
  });

  it("rejects something that is not a map", () => {
    expect(errorsOf("nope")).toHaveLength(1);
  });
});

describe("parseTmj: chunks", () => {
  it.each([15, 49])("rejects a chunk %i wide", (width) => {
    const map = makeMap(width, { spawns: chunkSpawns, properties: chunkProps() });
    expect(messages(map, "chunk")).toMatch(/width of a chunk/);
  });

  it("rejects a start on a chunk without the start tag", () => {
    const map = makeMap(16, {
      spawns: [{ type: "start", x: 9, y: 207 }],
      properties: chunkProps(),
    });
    expect(messages(map, "chunk")).toMatch(/expected 0 "start" spawn\(s\), found 1/);
  });

  it("requires a flag on a chunk tagged finish", () => {
    const map = makeMap(16, {
      spawns: chunkSpawns,
      properties: chunkProps(1, [{ name: "tags", type: "string", value: "finish" }]),
    });
    expect(messages(map, "chunk")).toMatch(/expected 1 "flag"/);
  });

  it("rejects missing, wrong-typed, out-of-range, repeated and unknown properties", () => {
    const map = makeMap(16, {
      spawns: chunkSpawns,
      properties: [
        { name: "difficulty", type: "int", value: 11 },
        { name: "entryRow", type: "string", value: "12" },
        { name: "tags", type: "int", value: 1 },
        { name: "tags", type: "int", value: 1 },
        { name: "colour", type: "string", value: "red" },
      ],
    });
    const text = messages(map, "chunk");
    expect(text).toMatch(/"difficulty" must be between 1 and 10, got 11/);
    expect(text).toMatch(/"entryRow" must be an int/);
    expect(text).toMatch(/missing map property "exitRow"/);
    expect(text).toMatch(/"tags" must be a string/);
    expect(text).toMatch(/"tags" appears twice/);
    expect(text).toMatch(/unknown map property "colour"/);
  });
});

describe("formatTmjError", () => {
  it("prints file, layer and cell", () => {
    expect(
      formatTmjError({ file: "a.tmj", layer: "terrain", col: 5, row: 3, message: "bad" }),
    ).toBe("a.tmj [terrain] (col 5, row 3): bad");
    expect(formatTmjError({ file: "a.tmj", message: "bad" })).toBe("a.tmj: bad");
  });
});
