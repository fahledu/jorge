import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildLevels } from "./build-levels.ts";

const repo = path.resolve(import.meta.dirname, "..");
const TSX = "assets/kenney/Tiled/tileset-tiles.tsx";
const roots: string[] = [];

/** A throwaway repository root with the tileset, the real chunks and the given manual levels. */
function makeRoot(manual: Record<string, string> = {}): string {
  const root = mkdtempSync(path.join(tmpdir(), "jorge-levels-"));
  roots.push(root);
  mkdirSync(path.join(root, path.dirname(TSX)), { recursive: true });
  cpSync(path.join(repo, TSX), path.join(root, TSX));
  cpSync(path.join(repo, "levels/chunks"), path.join(root, "levels/chunks"), { recursive: true });
  mkdirSync(path.join(root, "levels/manual"), { recursive: true });
  for (const [name, text] of Object.entries(manual)) {
    writeFileSync(path.join(root, "levels/manual", name), text);
  }
  return root;
}

const names = Array.from({ length: 100 }, (_, i) => `${String(i + 1).padStart(3, "0")}.json`);
const realSource = (): string => readFileSync(path.join(repo, "levels/manual/001.tmj"), "utf8");
const output = (root: string, name = "001.json"): string =>
  readFileSync(path.join(root, "levels/generated", name), "utf8");

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("buildLevels", () => {
  it("builds the 100 levels byte for byte the same twice", () => {
    const root = makeRoot({ "001.tmj": realSource() });
    const first = buildLevels({ root });
    expect(first.errors).toEqual([]);
    expect(first.written).toEqual(names);
    const before = names.map((name) => output(root, name));
    expect(buildLevels({ root })).toEqual({ written: [], removed: [], errors: [] });
    expect(names.map((name) => output(root, name))).toEqual(before);
  });

  it("matches the versioned levels/generated/", () => {
    const root = makeRoot({ "001.tmj": realSource() });
    buildLevels({ root });
    for (const name of names) {
      expect(output(root, name)).toBe(
        readFileSync(path.join(repo, "levels/generated", name), "utf8"),
      );
    }
  });

  it("changes only the levels that use a chunk when one of its tiles changes", () => {
    const root = makeRoot({ "001.tmj": realSource() });
    buildLevels({ root });
    const chunksOf = (name: string): string[] =>
      String(
        JSON.parse(output(root, name)).properties.find((p: { name: string }) => p.name === "chunks")
          ?.value ?? "",
      ).split(",");
    const usesGaps = names.filter((name) => chunksOf(name).includes("gaps"));
    const file = path.join(root, "levels/chunks/gaps.tmj");
    const json = JSON.parse(readFileSync(file, "utf8"));
    json.layers[1].data[0] = 86; // a signpost in the sky of the decor layer (same in every theme)
    writeFileSync(file, JSON.stringify(json));
    const { written } = buildLevels({ root });
    expect(usesGaps.length).toBeGreaterThan(1);
    expect(written).toEqual(usesGaps);
  });

  it("fails on a manual level whose flag cannot be reached", () => {
    const json = JSON.parse(realSource());
    json.layers[0].data = json.layers[0].data.map((gid: number, index: number) =>
      index % json.width === 60 ? 0 : gid,
    );
    for (let col = 61; col <= 64; col += 1) {
      for (let row = 0; row < 15; row += 1) json.layers[0].data[row * json.width + col] = 0;
    }
    const root = makeRoot({ "001.tmj": realSource(), "007.tmj": JSON.stringify(json) });
    expect(buildLevels({ root }).errors).toEqual([
      expect.stringMatching(
        /^level 7 \(levels\/manual\/007.tmj\): the flag is not reachable; farthest column \d+$/,
      ),
    ]);
  });

  it("rejects a chunk name outside a-z, 0-9 and -", () => {
    const root = makeRoot();
    cpSync(path.join(root, "levels/chunks/hop.tmj"), path.join(root, "levels/chunks/Hop_2.tmj"));
    expect(buildLevels({ root }).errors).toEqual([
      'levels/chunks/Hop_2.tmj: chunk names use only a-z, 0-9 and "-" (ADR 0013)',
    ]);
  });

  it("gives the same output for the source reformatted as Tiled saves it", () => {
    const original = makeRoot({ "001.tmj": realSource() });
    const reformatted = makeRoot({ "001.tmj": `${JSON.stringify(JSON.parse(realSource()))}\r\n` });
    buildLevels({ root: original });
    buildLevels({ root: reformatted });
    expect(output(reformatted)).toBe(output(original));
  });

  it("removes outputs that are not a level and rewrites a stale one", () => {
    const root = makeRoot({ "001.tmj": realSource() });
    buildLevels({ root });
    writeFileSync(path.join(root, "levels/generated/101.json"), "{}");
    writeFileSync(path.join(root, "levels/generated/007.json"), "{}");
    expect(buildLevels({ root })).toEqual({
      written: ["007.json"],
      removed: ["101.json"],
      errors: [],
    });
  });

  it("works without a manual folder", () => {
    const root = makeRoot();
    rmSync(path.join(root, "levels/manual"), { recursive: true });
    expect(buildLevels({ root }).errors).toEqual([]);
  });

  it("reports an invalid tile with the file and the cell", () => {
    const json = JSON.parse(realSource());
    json.layers[0].data[3] = 181;
    const root = makeRoot({ "001.tmj": JSON.stringify(json) });
    expect(buildLevels({ root }).errors).toEqual([
      "levels/manual/001.tmj [terrain] (col 3, row 0): GID 181 is outside the tileset (1 to 180)",
    ]);
  });

  it("reports invalid JSON", () => {
    const root = makeRoot({ "001.tmj": "{" });
    expect(buildLevels({ root }).errors[0]).toMatch(/^levels\/manual\/001.tmj: invalid JSON/);
  });

  it.each(["1.tmj", "abc.tmj", "000.tmj", "101.tmj"])("rejects the file name %s", (name) => {
    const root = makeRoot({ [name]: realSource() });
    expect(buildLevels({ root }).errors[0]).toMatch(/name must be NNN.tmj, from 001 to 100/);
  });

  describe("themes and new enemies (plan 1g2)", () => {
    // The versioned files equal a fresh build (checked above), so they are read as they are.
    const level = (n: number) =>
      JSON.parse(
        readFileSync(
          path.join(repo, `levels/generated/${String(n).padStart(3, "0")}.json`),
          "utf8",
        ),
      );
    const gids = (n: number, layer: string): number[] =>
      level(n).layers.find((l: { name: string }) => l.name === layer).data;
    const types = (n: number): string[] =>
      level(n).layers[2].objects.map((o: { type: string }) => o.type);

    it("keeps level 1 as the versioned file", () => {
      const fresh = makeRoot({ "001.tmj": realSource() });
      buildLevels({ root: fresh });
      expect(output(fresh)).toBe(
        readFileSync(path.join(repo, "levels/generated/001.json"), "utf8"),
      );
      expect(level(1).properties).toContainEqual({ name: "tier", type: "int", value: 1 });
    });

    it("draws the desert, the cave and the snow without grass", () => {
      for (const n of [31, 41, 71]) {
        const terrain = gids(n, "terrain");
        expect(terrain.some((g) => g >= 21 && g <= 24)).toBe(false);
        expect(terrain.some((g) => g >= 41)).toBe(true);
      }
    });

    it("level 11 has the meadow's collision and no sprout; 30 has no sand or snow", () => {
      expect(gids(11, "decor")).not.toContain(125);
      const solid = (n: number) => gids(n, "terrain").map((g) => (g === 0 ? 0 : 1));
      expect(solid(11).length).toBeGreaterThan(0);
      expect(gids(30, "terrain").some((g) => (g >= 41 && g <= 44) || (g >= 61 && g <= 64))).toBe(
        false,
      );
    });

    it("the spike is the same GID in levels 1 and 95", () => {
      expect(gids(1, "terrain")).toContain(69);
      expect(gids(95, "terrain")).toContain(69);
    });

    it("has at most one secret item, no spiky before 31 and no vertical flyer before 41", () => {
      for (let n = 1; n <= 100; n += 1) {
        const list = types(n);
        expect(list.filter((t) => t === "secret").length).toBeLessThanOrEqual(1);
        if (n < 31) expect(list).not.toContain("spiky");
        if (n < 41) expect(list).not.toContain("flyer-v");
      }
      const all = Array.from({ length: 100 }, (_, i) => types(i + 1)).flat();
      expect(all).toContain("spiky");
      expect(all).toContain("flyer-v");
      expect(all).toContain("secret");
    });

    it("rejects a manual level with two secret items", () => {
      const json = JSON.parse(realSource());
      const objects = json.layers[2].objects;
      const next = json.nextobjectid;
      for (const [i, x] of [100, 120].entries()) {
        objects.push({
          height: 0,
          id: next + i,
          name: "",
          point: true,
          rotation: 0,
          type: "secret",
          visible: true,
          width: 0,
          x,
          y: 171,
        });
      }
      json.nextobjectid = next + 2;
      const bad = makeRoot({ "001.tmj": JSON.stringify(json) });
      expect(buildLevels({ root: bad }).errors).toEqual([
        'level 1 (levels/manual/001.tmj): a level has at most one "secret" spawn',
      ]);
    });

    it("applies the theme of its tier to a manual level", () => {
      const manual = makeRoot({ "001.tmj": realSource(), "031.tmj": realSource() });
      expect(buildLevels({ root: manual }).errors).toEqual([]);
      const terrain = JSON.parse(output(manual, "031.json")).layers[0].data as number[];
      expect(terrain.some((g) => g >= 61 && g <= 64)).toBe(true);
      expect(terrain.some((g) => g >= 21 && g <= 24)).toBe(false);
    });
  });
});
