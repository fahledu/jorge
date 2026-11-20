import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildLevels } from "./build-levels.ts";
import { checkLevels } from "./check-levels.ts";

const repo = path.resolve(import.meta.dirname, "..");
let root = "";
const generated = (name: string): string => path.join(root, "levels/generated", name);

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), "jorge-check-"));
  for (const dir of ["assets/kenney/Tiled", "levels/chunks", "levels/manual"]) {
    mkdirSync(path.join(root, dir), { recursive: true });
  }
  cpSync(
    path.join(repo, "assets/kenney/Tiled/tileset-tiles.tsx"),
    path.join(root, "assets/kenney/Tiled/tileset-tiles.tsx"),
  );
  cpSync(path.join(repo, "levels/chunks"), path.join(root, "levels/chunks"), { recursive: true });
  cpSync(path.join(repo, "levels/manual"), path.join(root, "levels/manual"), { recursive: true });
  buildLevels({ root });
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("checkLevels", () => {
  it("passes on the built levels", () => {
    expect(checkLevels(root)).toEqual([]);
  });

  it("names a level file edited by one byte, and passes again once restored", () => {
    const original = readFileSync(generated("037.json"), "utf8");
    writeFileSync(generated("037.json"), original.replace('"seed"', '"seeD"'));
    expect(checkLevels(root)).toEqual([
      "levels/generated/037.json: differs from the generator output",
    ]);
    writeFileSync(generated("037.json"), original);
    expect(checkLevels(root)).toEqual([]);
  });

  it("reports a missing and an extra file", () => {
    const original = readFileSync(generated("050.json"), "utf8");
    rmSync(generated("050.json"));
    writeFileSync(generated("101.json"), "{}");
    expect(checkLevels(root)).toEqual([
      "levels/generated/101.json: extra file",
      "levels/generated/050.json: missing",
    ]);
    rmSync(generated("101.json"));
    writeFileSync(generated("050.json"), original);
  });

  it("reports the build errors", () => {
    const chunk = path.join(root, "levels/chunks/finish.tmj");
    const original = readFileSync(chunk, "utf8");
    rmSync(chunk);
    expect(checkLevels(root)).toEqual(['level 2 (tier 1): no chunk with the "finish" tag']);
    writeFileSync(chunk, original);
  });
});
