import { describe, expect, it } from "vitest";
import { fullLibrary, makeChunk } from "./fixtures/chunks.ts";
import { type GeneratedLevel, generateLevel, type LibraryChunk } from "./generator.ts";
import type { SpawnType } from "./tmj.ts";

const START = makeChunk("start", { tags: ["start"] });
const FINISH = makeChunk("finish", { tags: ["finish"] });

function ok(level: GeneratedLevel) {
  if (!level.ok) throw new Error(level.error);
  return level;
}

const middles = (level: ReturnType<typeof ok>): string[] => level.chunks.slice(1, -1);
const count = (level: ReturnType<typeof ok>, type: SpawnType): number =>
  level.map.spawns.filter((s) => s.type === type).length;

/** A library whose start chunk carries the given spawns, with plain middles for every tier. */
function withStartSpawns(spawns: { type: SpawnType; col: number; minTier?: number }[]) {
  return [
    makeChunk("start", { tags: ["start"], width: 32, spawns }),
    ...fullLibrary().filter((c) => c.name !== "start"),
  ];
}

describe("generateLevel", () => {
  it("gives the same output for the same input", () => {
    expect(generateLevel(57, fullLibrary())).toEqual(generateLevel(57, fullLibrary()));
  });

  it("reads the library in name order, whatever the order it comes in", () => {
    expect(generateLevel(57, [...fullLibrary()].reverse())).toEqual(
      generateLevel(57, fullLibrary()),
    );
  });

  it("starts with the start chunk and ends with the finish chunk", () => {
    const level = ok(generateLevel(42, fullLibrary()));
    expect(level.chunks[0]).toBe("start");
    expect(level.chunks.at(-1)).toBe("finish");
    expect(level.tier).toBe(5);
  });

  it("has 3 middle chunks on level 10 and 9 on level 100", () => {
    expect(middles(ok(generateLevel(10, fullLibrary())))).toHaveLength(3);
    expect(middles(ok(generateLevel(100, fullLibrary())))).toHaveLength(9);
  });

  it("never puts the same chunk twice in a row and stays in the difficulty range, on 100 levels", () => {
    for (let n = 1; n <= 100; n += 1) {
      const level = ok(generateLevel(n, fullLibrary()));
      level.chunks.forEach((name, i) => {
        if (i > 0) expect(name).not.toBe(level.chunks[i - 1]);
      });
      const tier = Math.ceil(n / 10);
      for (const name of middles(level)) {
        const difficulty = Number(/^m(\d+)/.exec(name)?.[1]);
        expect(difficulty).toBeGreaterThanOrEqual(Math.max(1, tier - 2));
        expect(difficulty).toBeLessThanOrEqual(tier);
      }
    }
  });

  it("refuses a chunk 3 rows above the previous exit and accepts 2 above or any below", () => {
    const library = [
      START,
      FINISH,
      makeChunk("high", { entryRow: 9 }),
      makeChunk("step", { entryRow: 10, exitRow: 12 }),
      makeChunk("low", { entryRow: 14, exitRow: 12 }),
    ];
    const seen = new Set<string>();
    for (let n = 2; n <= 10; n += 1)
      for (const name of ok(generateLevel(n, library)).chunks) seen.add(name);
    expect(seen).toEqual(new Set(["start", "step", "low", "finish"]));
  });

  it("draws only the two difficulty-8 chunks on tier 10 when nothing else is in the difficulty range", () => {
    const library = [
      START,
      FINISH,
      makeChunk("a", { difficulty: 8 }),
      makeChunk("b", { difficulty: 8 }),
    ];
    const level = ok(generateLevel(100, library));
    const drawn = middles(level);
    expect(new Set(drawn)).toEqual(new Set(["a", "b"]));
    drawn.forEach((name, i) => {
      if (i > 0) expect(name).not.toBe(drawn[i - 1]);
    });
  });

  it("fails on the second middle chunk when the difficulty range has a single chunk", () => {
    const level = generateLevel(100, [START, FINISH, makeChunk("a", { difficulty: 8 })]);
    expect(level).toEqual({
      ok: false,
      error:
        "level 100 (tier 10): no chunk fits middle position 2 after a (exitRow 12), after 20 attempts",
    });
  });

  it("fails with the level and the tier when the difficulty range is empty", () => {
    const level = generateLevel(100, [START, FINISH, makeChunk("a", { difficulty: 7 })]);
    expect(level).toEqual({
      ok: false,
      error: "level 100 (tier 10): no middle chunk with difficulty 8 to 10",
    });
  });

  it("fails on a chunk with both tags, without a finish and without a start", () => {
    const both = makeChunk("both", { tags: ["start", "finish"] });
    expect(generateLevel(2, [...fullLibrary(), both])).toEqual({
      ok: false,
      error: 'chunk both has both the "start" and "finish" tags',
    });
    const noFinish = fullLibrary().filter((c) => c.name !== "finish");
    expect(generateLevel(2, noFinish)).toEqual({
      ok: false,
      error: 'level 2 (tier 1): no chunk with the "finish" tag',
    });
    const noStart = fullLibrary().filter((c) => c.name !== "start");
    expect(generateLevel(2, noStart)).toMatchObject({ ok: false, error: /"start" tag/ });
  });

  it("fails on a chunk without chunk properties", () => {
    const manual: LibraryChunk = { name: "odd", map: { ...START.map, chunk: null } };
    expect(generateLevel(2, [manual])).toEqual({
      ok: false,
      error: "chunk odd has no chunk properties",
    });
  });

  it("keeps round(density × enemies) enemies: 2 of 5 on level 2, 9 of 10 on level 100", () => {
    const five = [2, 4, 6, 8, 10].map((col) => ({ type: "walker" as const, col }));
    expect(count(ok(generateLevel(2, withStartSpawns(five))), "walker")).toBe(2);
    const ten = [2, 4, 6, 8, 10, 12, 14, 18, 20, 22].map((col) => ({
      type: "walker" as const,
      col,
    }));
    expect(count(ok(generateLevel(100, withStartSpawns(ten))), "walker")).toBe(9);
  });

  it("turns flyers on from tier 3: off on level 20, eligible on 21", () => {
    const flyers = [2, 6, 10, 14].map((col) => ({ type: "flyer" as const, col }));
    expect(count(ok(generateLevel(20, withStartSpawns(flyers))), "flyer")).toBe(0);
    // Density 0.42 on level 21: round(0.42 × 4) = 2.
    expect(count(ok(generateLevel(21, withStartSpawns(flyers))), "flyer")).toBe(2);
  });

  it("turns a coin with minTier 4 off on level 30 and on on 31", () => {
    const coin = [{ type: "coin" as const, col: 5, minTier: 4 }];
    expect(count(ok(generateLevel(30, withStartSpawns(coin))), "coin")).toBe(0);
    const level = ok(generateLevel(31, withStartSpawns(coin)));
    expect(count(level, "coin")).toBe(1);
    expect(level.map.spawns.some((s) => s.minTier !== undefined)).toBe(false);
  });

  it("numbers the spawns from 1 and shifts them by the chunk offset", () => {
    const library = [
      START,
      makeChunk("finish", { tags: ["finish"], spawns: [{ type: "coin", col: 3 }] }),
      makeChunk("a", { spawns: [{ type: "coin", col: 4 }] }),
      makeChunk("b", { spawns: [{ type: "heart", col: 5 }] }),
    ];
    const level = ok(generateLevel(2, library));
    expect(level.map.spawns.map((s) => s.id)).toEqual(
      level.map.spawns.map((_, index) => index + 1),
    );
    const flag = level.map.spawns.find((s) => s.type === "flag");
    // Finish chunk is the last 16 columns; its flag sits on column 14 of the chunk.
    expect(flag?.x).toBe((level.map.width - 16 + 14) * 18 + 9);
    expect(flag?.col).toBe(level.map.width - 2);
  });

  it("redraws grass and dirt edges at the joins and leaves other tiles alone", () => {
    const start = makeChunk("start", { tags: ["start"] });
    start.map.terrain[11 * 16 + 15] = 69; // spike on the last column, above the grass
    const library = [
      start,
      FINISH,
      makeChunk("a", { entryRow: 14 }),
      makeChunk("b", { entryRow: 14 }),
    ];
    const { map } = ok(generateLevel(2, library));
    const at = (col: number, row: number): number => map.terrain[row * map.width + col] ?? -1;
    // Start ends at column 15 with ground on row 12; the next chunk begins lower (row 14).
    expect(at(15, 12)).toBe(24); // grass, right edge
    expect(at(15, 13)).toBe(124); // dirt, right edge
    expect(at(15, 14)).toBe(123); // dirt with ground on both sides stays the middle
    expect(at(15, 11)).toBe(69);
    expect(at(16, 14)).toBe(23); // grass of the next chunk, ground on the left
  });

  it("makes a lone column when both sides are empty", () => {
    const pillar = makeChunk("start", { tags: ["start"] });
    const library = [
      pillar,
      FINISH,
      makeChunk("a", { entryRow: 14 }),
      makeChunk("b", { entryRow: 14 }),
    ];
    pillar.map.terrain[12 * 16 + 14] = 0; // empty left of the last column at row 12
    const { map } = ok(generateLevel(2, library));
    expect(map.terrain[12 * map.width + 15]).toBe(21);
  });
});
