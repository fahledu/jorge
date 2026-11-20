import { describe, expect, it } from "vitest";
import { chunkWeight, difficultyWindow, enemyDensity, middleChunkCount, tierOf } from "./curve.ts";

describe("curve", () => {
  it("groups levels in tiers of 10", () => {
    expect([1, 10, 11, 100].map(tierOf)).toEqual([1, 1, 2, 10]);
  });

  it("has 3 middle chunks on level 1 and 9 on level 100", () => {
    expect([1, 10, 15, 16, 100].map(middleChunkCount)).toEqual([3, 3, 3, 4, 9]);
  });

  it("raises the enemy density from 0.3 to 0.9", () => {
    expect(enemyDensity(1)).toBeCloseTo(0.3, 10);
    expect(enemyDensity(100)).toBeCloseTo(0.9, 10);
  });

  it("draws from the tier and the two below it, never below 1", () => {
    expect(difficultyWindow(1)).toEqual({ min: 1, max: 1 });
    expect(difficultyWindow(2)).toEqual({ min: 1, max: 2 });
    expect(difficultyWindow(10)).toEqual({ min: 8, max: 10 });
  });

  it("weighs 3, 2 and 1 inside the difficulty range and 0 outside", () => {
    expect([10, 9, 8, 7, 11].map((d) => chunkWeight(10, d))).toEqual([3, 2, 1, 0, 0]);
  });
});
