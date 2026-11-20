import { describe, expect, it } from "vitest";
import { createPrng, fnv1a32, levelSeed } from "./prng.ts";

const take = (next: () => number, n: number): number[] => Array.from({ length: n }, next);

describe("fnv1a32 and levelSeed", () => {
  it("hashes the empty text to the FNV offset basis", () => {
    expect(fnv1a32("")).toBe(2166136261);
  });

  it("seeds level n from the text jorge:n", () => {
    expect(levelSeed(2)).toBe(fnv1a32("jorge:2"));
    expect(levelSeed(2)).toBe(350596256);
    expect(levelSeed(3)).not.toBe(levelSeed(2));
  });
});

describe("createPrng", () => {
  it("gives the same sequence for the same seed", () => {
    expect(take(createPrng(99), 20)).toEqual(take(createPrng(99), 20));
  });

  it("stays in [0, 1)", () => {
    for (const value of take(createPrng(7), 10_000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("keeps the first values of seed 1 and of level 2 (regression)", () => {
    expect(take(createPrng(1), 5)).toEqual([
      0.6270739405881613, 0.002735721180215478, 0.5274470399599522, 0.9810509674716741,
      0.9683778982143849,
    ]);
    expect(take(createPrng(levelSeed(2)), 5)).toEqual([
      0.746844562003389, 0.7683371026068926, 0.6112279500812292, 0.5244264185894281,
      0.3265495460946113,
    ]);
  });
});
