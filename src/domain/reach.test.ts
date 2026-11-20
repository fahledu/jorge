import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TILESET } from "./fixtures/maps.ts";
import { checkReachable, validatorReach } from "./reach.ts";
import { parseTmj } from "./tmj.ts";

/**
 * A 15-row map from a drawing of its bottom rows: `#` ground, `^` spike, `S` start, `F` flag
 * (both standing where they are drawn), anything else empty.
 */
function draw(lines: string[]) {
  const rows = [...Array<string>(15 - lines.length).fill(""), ...lines];
  const width = Math.max(...lines.map((l) => l.length));
  const terrain: number[] = [];
  let start = { x: 0, y: 0 };
  let flag = { x: 0, y: 0 };
  rows.forEach((line, row) => {
    for (let col = 0; col < width; col += 1) {
      const ch = line[col] ?? ".";
      terrain.push(ch === "#" ? 23 : ch === "^" ? 69 : 0);
      const point = { x: col * 18 + 9, y: row * 18 + 9 };
      if (ch === "S") start = point;
      if (ch === "F") flag = point;
    }
  });
  return checkReachable({ width, terrain, start, flag });
}

const ground = (pattern: string): string[] => [pattern, pattern, pattern];

describe("validatorReach", () => {
  it("keeps one below the real jump: rise 3, gap 3, headroom 5", () => {
    expect(validatorReach()).toEqual({ rise: 3, gap: 3, headroomRows: 5 });
  });
});

describe("checkReachable", () => {
  it("accepts a gap of 3 and rejects a gap of 4", () => {
    expect(draw([".S........F.", ...ground("#####...####")])).toEqual({ ok: true });
    expect(draw([".S.........F.", ...ground("#####....####")])).toEqual({
      ok: false,
      farthestCol: 4,
    });
  });

  it("accepts a step of 3 up and rejects a step of 4", () => {
    expect(draw(["......F.", "....####", "....####", ".S..####", ...ground("########")])).toEqual({
      ok: true,
    });
    expect(
      draw(["......F.", "....####", "....####", "....####", ".S..####", ...ground("########")]),
    ).toEqual({ ok: false, farthestCol: 3 });
  });

  it("accepts a step of 3 up across a gap of 3", () => {
    expect(
      draw([
        "........F.",
        ".......###",
        ".......###",
        ".S.....###",
        "####...###",
        "####...###",
        "####...###",
      ]),
    ).toEqual({ ok: true });
  });

  it("rejects a gap of 3 under a ceiling on row 6 and accepts it under row 5", () => {
    const ceiling = (row: number) => {
      const lines = Array<string>(15).fill("............");
      lines[row] = "############";
      lines[11] = ".S........F.";
      for (const r of [12, 13, 14]) lines[r] = "#####...####";
      return lines;
    };
    expect(draw(ceiling(6))).toEqual({ ok: false, farthestCol: 4 });
    expect(draw(ceiling(5))).toEqual({ ok: true });
  });

  it("does not jump up through a slab two rows above the feet", () => {
    expect(draw(["..F", "###", "...", "S..", "###"])).toEqual({ ok: false, farthestCol: 2 });
  });

  it("jumps over 1 and 3 spikes but not over 4", () => {
    expect(draw([".S...^.....F.", ...ground("#############")])).toEqual({ ok: true });
    expect(draw([".S...^^^...F.", ...ground("#############")])).toEqual({ ok: true });
    expect(draw([".S...^^^^..F.", ...ground("#############")])).toEqual({
      ok: false,
      farthestCol: 4,
    });
  });

  it("does not fall onto a spike", () => {
    // The ceiling on row 10 rules out jumps: only walking and falling are left.
    expect(draw(["###", "...", "S..", "#F#", "###"])).toEqual({ ok: true });
    expect(draw(["###", "...", "S.F", "#^#", "###"])).toEqual({ ok: false, farthestCol: 0 });
  });

  it("walks down and drops off ledges", () => {
    expect(draw([".S......", "####....", "####....", "####...F", "########"])).toEqual({
      ok: true,
    });
  });

  it("rejects a flag reachable only with a spring", () => {
    expect(
      draw([
        "......F.",
        "......##",
        "........",
        "........",
        "........",
        ".S......",
        ...ground("########"),
      ]),
    ).toEqual({ ok: false, farthestCol: 7 });
  });

  it("accepts the flag one row above where the player stands", () => {
    expect(draw([".S..F", "....#", "#####", "#####"])).toEqual({ ok: true });
  });

  it("rejects a start above a pit open to the bottom", () => {
    expect(draw(["..S...F.", "##.#####", "##.#####", "##.#####"])).toEqual({
      ok: false,
      farthestCol: 2,
    });
  });

  it("treats the sides and the top of the map as walls", () => {
    // Standing on row 4 the headroom reaches above the map: no jump, only walking.
    expect(draw(["S...F", "#####", ...Array(9).fill("....."), "....."])).toEqual({ ok: true });
    expect(draw(["S..F.", "##.##", ...Array(9).fill("....."), "....."]).ok).toBe(false);
  });

  it("passes the real level 1", () => {
    const json = JSON.parse(readFileSync("levels/manual/001.tmj", "utf8"));
    const parsed = parseTmj(json, {
      kind: "manual",
      file: "levels/manual/001.tmj",
      tileset: TILESET,
    });
    if (!parsed.ok) throw new Error("level 1 does not parse");
    const { map } = parsed;
    const point = (type: string) => map.spawns.find((s) => s.type === type) ?? { x: 0, y: 0 };
    expect(
      checkReachable({
        width: map.width,
        terrain: map.terrain,
        start: point("start"),
        flag: point("flag"),
      }),
    ).toEqual({ ok: true });
  });
});
