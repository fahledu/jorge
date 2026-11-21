import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { makeMap, TILESET } from "./fixtures/maps.ts";
import {
  buildGeneratedLevel,
  buildManualLevel,
  type ManualLevelInput,
  readLevelInfo,
  targetTimeSeconds,
  tierOf,
} from "./level.ts";
import { parseTmj, type TmjMap } from "./tmj.ts";

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");
const IMAGE = "../../assets/kenney/Tilemap/tilemap_packed.png";

function mapOf(json: unknown): TmjMap {
  const result = parseTmj(json, {
    kind: "manual",
    file: "levels/manual/001.tmj",
    tileset: TILESET,
  });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.map;
}

function input(map: TmjMap, levelNumber = 1): ManualLevelInput {
  return { levelNumber, source: "manual/001.tmj", map, tileset: TILESET, imagePath: IMAGE, sha256 };
}

/** Same keys in reverse order at every level, like a file saved by another tool. */
function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([k, v]) => [k, reverseKeys(v)]),
    );
  }
  return value;
}

describe("tierOf and targetTimeSeconds", () => {
  it("gives tier 1 to level 1 and 10 to level 100", () => {
    expect(tierOf(1)).toBe(1);
    expect(tierOf(10)).toBe(1);
    expect(tierOf(11)).toBe(2);
    expect(tierOf(100)).toBe(10);
  });

  it("gives 25 s to widths 97 and 100, 26 s to 101", () => {
    expect(targetTimeSeconds(97)).toBe(25);
    expect(targetTimeSeconds(100)).toBe(25);
    expect(targetTimeSeconds(101)).toBe(26);
  });
});

describe("buildManualLevel", () => {
  const map = mapOf(makeMap(100));

  it("gives the same string twice", () => {
    expect(buildManualLevel(input(map)).json).toBe(buildManualLevel(input(map)).json);
  });

  it("does not depend on key order in the source", () => {
    const reordered = mapOf(reverseKeys(makeMap(100)));
    expect(buildManualLevel(input(reordered))).toEqual(buildManualLevel(input(map)));
  });

  it("hashes the serialization without contentHash", () => {
    const { json, contentHash } = buildManualLevel(input(map));
    expect(contentHash).toMatch(/^[0-9a-f]{16}$/);
    const without = json.replace(
      /\n {4}\{\n {6}"name": "contentHash",\n {6}"type": "string",\n {6}"value": "[0-9a-f]{16}"\n {4}\},/,
      "",
    );
    expect(without).not.toBe(json);
    expect(sha256(without).slice(0, 16)).toBe(contentHash);
  });

  it("changes the hash when a GID changes", () => {
    const changed = mapOf(makeMap(100));
    changed.terrain[0] = 5;
    expect(buildManualLevel(input(changed)).contentHash).not.toBe(
      buildManualLevel(input(map)).contentHash,
    );
  });

  it("ends with LF, has no CR and one map row per data line", () => {
    const { json } = buildManualLevel(input(map));
    expect(json.endsWith("}\n")).toBe(true);
    expect(json).not.toContain("\r");
    const firstRow = json.split('"data": [\n')[1]?.split("\n")[0] ?? "";
    expect(firstRow.trim().split(",").filter(Boolean)).toHaveLength(100);
  });

  it("writes the level properties in name order and embeds the tileset", () => {
    const level = JSON.parse(buildManualLevel(input(map)).json);
    expect(level.properties.map((p: { name: string }) => p.name)).toEqual([
      "contentHash",
      "levelNumber",
      "source",
      "targetTimeSeconds",
      "tier",
    ]);
    expect(level.properties[3].value).toBe(25);
    expect(level.tilesets[0]).toMatchObject({ firstgid: 1, name: "tileset-tiles", image: IMAGE });
    expect(level.version).toBe("1.10");
  });

  it("keeps minTier on spawns, sorts them by id and counts the next object id", () => {
    const json = makeMap(30, {
      spawns: [
        { type: "start", x: 9, y: 207 },
        { type: "flag", x: 500, y: 207 },
        { type: "coin", x: 90, y: 90, properties: [{ name: "minTier", type: "int", value: 2 }] },
      ],
    });
    const parsed = mapOf(json);
    parsed.spawns.reverse();
    const level = JSON.parse(buildManualLevel(input(parsed)).json);
    const objects = level.layers[2].objects;
    expect(objects.map((o: { id: number }) => o.id)).toEqual([1, 2, 3]);
    expect(objects[2].properties).toEqual([{ name: "minTier", type: "int", value: 2 }]);
    expect(level.nextobjectid).toBe(4);
  });

  it.each([0, 101, 1.5])("rejects level number %s", (levelNumber) => {
    expect(() => buildManualLevel(input(map, levelNumber))).toThrow(/level number/);
  });

  it("reads back what the game needs", () => {
    const info = readLevelInfo(JSON.parse(buildManualLevel(input(map)).json));
    expect(info).toEqual({
      levelNumber: 1,
      widthInTiles: 100,
      targetTimeSeconds: 25,
      tilesetName: "tileset-tiles",
      theme: "meadow",
      secret: null,
      start: { x: 27, y: 207 },
      flag: { x: 98 * 18 + 9, y: 207 },
      items: [],
      spikes: [],
      enemies: [],
      pits: [],
      groundRow: 12,
    });
  });
});

describe("readLevelInfo", () => {
  const level = () => JSON.parse(buildManualLevel(input(mapOf(makeMap(27)))).json);

  it("rejects a file without the generated format", () => {
    expect(() => readLevelInfo({ width: 3 })).toThrow(/generated format/);
  });

  it("rejects a file without levelNumber", () => {
    const file = level();
    file.properties = [];
    expect(() => readLevelInfo(file)).toThrow(/levelNumber/);
  });

  it("rejects a file without targetTimeSeconds", () => {
    const file = level();
    file.properties = file.properties.filter(
      (p: { name: string }) => p.name !== "targetTimeSeconds",
    );
    expect(() => readLevelInfo(file)).toThrow(/targetTimeSeconds/);
  });

  it("rejects a file without a flag", () => {
    const file = level();
    file.layers[2].objects.pop();
    expect(() => readLevelInfo(file)).toThrow(/"flag"/);
  });

  it("treats a file without the spawns layer as having no start", () => {
    const file = level();
    file.layers.pop();
    expect(() => readLevelInfo(file)).toThrow(/"start"/);
  });

  it("reads the items, spikes and enemies of level 1", () => {
    const tmj = JSON.parse(readFileSync("levels/manual/001.tmj", "utf8"));
    const built = JSON.parse(buildManualLevel(input(mapOf(tmj))).json);
    const info = readLevelInfo(built);
    const count = (type: string) => info.items.filter((i) => i.type === type).length;
    expect(info.widthInTiles).toBe(180);
    expect(info.targetTimeSeconds).toBe(45);
    expect(built.properties).toContainEqual({
      name: "targetTimeSeconds",
      type: "int",
      value: 45,
    });
    expect(count("coin")).toBe(6);
    expect(count("heart")).toBe(1);
    expect(count("spring")).toBe(1);
    expect(info.items.find((i) => i.type === "spring")).toEqual({
      id: 6,
      type: "spring",
      x: 93 * 18 + 9,
      y: 207,
    });
    expect(info.spikes).toEqual([
      { col: 75, row: 11 },
      { col: 81, row: 11 },
      { col: 82, row: 11 },
    ]);
    expect(info.enemies).toEqual([
      { id: 10, type: "walker", x: 2313, y: 207, row: 11, range: { min: 2204, max: 2422 } },
      { id: 11, type: "walker", x: 2637, y: 171, row: 9, range: { min: 2564, max: 2710 } },
      { id: 12, type: "flyer", x: 2997, y: 171, row: 9, range: { min: 2942, max: 3052 } },
    ]);
  });

  it("reads the pits and the ground row below the start of level 1", () => {
    const tmj = JSON.parse(readFileSync("levels/manual/001.tmj", "utf8"));
    const info = readLevelInfo(JSON.parse(buildManualLevel(input(mapOf(tmj))).json));
    expect(info.pits).toEqual([38, 39, 46, 47, 48]);
    expect(info.groundRow).toBe(12);
  });

  it("takes the last row as the ground when the start has none below", () => {
    const map = mapOf(makeMap(27));
    map.terrain = map.terrain.map((gid, index) => (index % 27 === 1 ? 0 : gid));
    const info = readLevelInfo(JSON.parse(buildManualLevel(input(map)).json));
    expect(info.groundRow).toBe(14);
    expect(info.pits).toEqual([1]);
  });

  it("rejects a spawn without an id", () => {
    const file = level();
    delete file.layers[2].objects[0].id;
    expect(() => readLevelInfo(file)).toThrow(/generated format/);
  });
});

describe("buildGeneratedLevel", () => {
  const generated = () => {
    const map = { ...mapOf(makeMap(40)), kind: "generated" as const };
    return buildGeneratedLevel({
      levelNumber: 37,
      seed: 123,
      chunks: ["start", "meadow", "finish"],
      map,
      tileset: TILESET,
      imagePath: IMAGE,
      sha256,
    });
  };

  it("writes the generated properties in name order", () => {
    const level = JSON.parse(generated().json);
    expect(level.properties).toEqual([
      { name: "chunks", type: "string", value: "start,meadow,finish" },
      { name: "contentHash", type: "string", value: generated().contentHash },
      { name: "generatorVersion", type: "int", value: 2 },
      { name: "levelNumber", type: "int", value: 37 },
      { name: "seed", type: "int", value: 123 },
      { name: "targetTimeSeconds", type: "int", value: 10 },
      { name: "tier", type: "int", value: 4 },
    ]);
  });

  it("hashes the file without its contentHash", () => {
    const { json, contentHash } = generated();
    const level = JSON.parse(json);
    expect(contentHash).toMatch(/^[0-9a-f]{16}$/);
    const without = json.replace(/\n {4}\{\n {6}"name": "contentHash"[^}]*\},/, "");
    expect(without).not.toBe(json);
    expect(sha256(without).slice(0, 16)).toBe(contentHash);
    expect(readLevelInfo(level).levelNumber).toBe(37);
  });

  it("refuses a level number outside 1 to 100", () => {
    const map = mapOf(makeMap(40));
    const base = { seed: 1, chunks: [], map, tileset: TILESET, imagePath: IMAGE, sha256 };
    expect(() => buildGeneratedLevel({ ...base, levelNumber: 101 })).toThrow(/level number/);
  });
});

describe("theme and secret item of readLevelInfo (plan 1g2)", () => {
  const withTier = (levelNumber: number) => {
    const file = JSON.parse(buildManualLevel(input(mapOf(makeMap(100)), levelNumber)).json);
    return file;
  };

  it("reads the theme from the tier of the file", () => {
    expect(readLevelInfo(withTier(1)).theme).toBe("meadow");
    expect(readLevelInfo(withTier(25)).theme).toBe("farm");
    expect(readLevelInfo(withTier(35)).theme).toBe("desert");
  });

  it("rejects a file without a tier", () => {
    const file = withTier(1);
    file.properties = file.properties.filter((p: { name: string }) => p.name !== "tier");
    expect(() => readLevelInfo(file)).toThrow(/tier/);
  });

  it("reads the secret item, or null", () => {
    const file = withTier(1);
    expect(readLevelInfo(file).secret).toBeNull();
    file.layers[2].objects.push({ id: 90, type: "secret", x: 99, y: 171 });
    expect(readLevelInfo(file).secret).toEqual({ id: 90, x: 99, y: 171 });
  });

  it("reads the new enemy types with their range", () => {
    const file = withTier(1);
    file.layers[2].objects.push(
      { id: 91, type: "spiky", x: 99, y: 207 },
      { id: 92, type: "flyer-v", x: 99, y: 117 },
    );
    const { enemies } = readLevelInfo(file);
    expect(enemies.map((e) => e.type)).toEqual(["spiky", "flyer-v"]);
    expect(enemies[1]?.range).toEqual({ min: 60, max: 174 });
  });
});
