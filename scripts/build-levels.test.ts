import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildLevels } from "./build-levels.ts";

const repo = path.resolve(import.meta.dirname, "..");
const TSX = "assets/kenney/Tiled/tileset-tiles.tsx";
const roots: string[] = [];

/** A throwaway repository root with the tileset and the given manual levels. */
function makeRoot(manual: Record<string, string> = {}): string {
  const root = mkdtempSync(path.join(tmpdir(), "jorge-levels-"));
  roots.push(root);
  mkdirSync(path.join(root, path.dirname(TSX)), { recursive: true });
  cpSync(path.join(repo, TSX), path.join(root, TSX));
  mkdirSync(path.join(root, "levels/manual"), { recursive: true });
  for (const [name, text] of Object.entries(manual)) {
    writeFileSync(path.join(root, "levels/manual", name), text);
  }
  return root;
}

const realSource = (): string => readFileSync(path.join(repo, "levels/manual/001.tmj"), "utf8");
const output = (root: string, name = "001.json"): string =>
  readFileSync(path.join(root, "levels/generated", name), "utf8");

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("buildLevels", () => {
  it("builds the real level 1 byte for byte the same twice", () => {
    const root = makeRoot({ "001.tmj": realSource() });
    expect(buildLevels({ root })).toEqual({ written: ["001.json"], removed: [], errors: [] });
    const first = output(root);
    expect(buildLevels({ root })).toEqual({ written: [], removed: [], errors: [] });
    expect(output(root)).toBe(first);
  });

  it("matches the versioned levels/generated/001.json (until levels:check in 1g)", () => {
    const root = makeRoot({ "001.tmj": realSource() });
    buildLevels({ root });
    expect(output(root)).toBe(readFileSync(path.join(repo, "levels/generated/001.json"), "utf8"));
  });

  it("gives the same output for the source reformatted as Tiled saves it", () => {
    const original = makeRoot({ "001.tmj": realSource() });
    const reformatted = makeRoot({ "001.tmj": `${JSON.stringify(JSON.parse(realSource()))}\r\n` });
    buildLevels({ root: original });
    buildLevels({ root: reformatted });
    expect(output(reformatted)).toBe(output(original));
  });

  it("removes outputs without a source, and builds nothing from an empty folder", () => {
    const root = makeRoot();
    mkdirSync(path.join(root, "levels/generated"), { recursive: true });
    writeFileSync(path.join(root, "levels/generated/007.json"), "{}");
    expect(buildLevels({ root })).toEqual({ written: [], removed: ["007.json"], errors: [] });
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
