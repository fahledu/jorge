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
    json.layers[1].data[0] = 125; // a sprout in the sky of the decor layer
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
});
