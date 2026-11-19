import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { makeMap, TILESET } from "./fixtures/maps.ts";
import {
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
      tilesetName: "tileset-tiles",
      start: { x: 27, y: 207 },
      flag: { x: 98 * 18 + 9, y: 207 },
      items: [],
      spikes: [],
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

  it("reads the coins, hearts, springs and spikes of level 1", () => {
    const tmj = JSON.parse(readFileSync("levels/manual/001.tmj", "utf8"));
    const info = readLevelInfo(JSON.parse(buildManualLevel(input(mapOf(tmj))).json));
    const count = (type: string) => info.items.filter((i) => i.type === type).length;
    expect(count("coin")).toBe(5);
    expect(count("heart")).toBe(1);
    expect(count("spring")).toBe(1);
    expect(info.items.find((i) => i.type === "spring")).toEqual({
      id: 5,
      type: "spring",
      x: 729,
      y: 207,
    });
    expect(info.spikes).toEqual([
      { col: 51, row: 11 },
      { col: 52, row: 11 },
    ]);
  });

  it("rejects a spawn without an id", () => {
    const file = level();
    delete file.layers[2].objects[0].id;
    expect(() => readLevelInfo(file)).toThrow(/generated format/);
  });
});
