import { describe, expect, it } from "vitest";
import {
  cellOf,
  cellsWith,
  feetIn,
  flagZone,
  itemBox,
  knockbackDirection,
  overlaps,
  spikeBox,
  springBox,
} from "./geometry.ts";

describe("geometry", () => {
  it("finds the cell of a point", () => {
    expect(cellOf({ x: 27, y: 207 })).toEqual({ col: 1, row: 11 });
    expect(cellOf({ x: 18, y: 0 })).toEqual({ col: 1, row: 0 });
  });

  it("puts the feet at the bottom centre of a cell", () => {
    expect(feetIn({ col: 1, row: 11 })).toEqual({ x: 27, y: 216 });
  });

  it("flag zone covers its column, the spawn row and the one above", () => {
    expect(flagZone({ x: 1665, y: 207 })).toEqual({
      left: 1656,
      top: 180,
      right: 1674,
      bottom: 216,
    });
  });

  it("overlap needs shared area", () => {
    const a = { left: 0, top: 0, right: 10, bottom: 10 };
    expect(overlaps(a, { left: 5, top: 5, right: 15, bottom: 15 })).toBe(true);
    expect(overlaps(a, { left: 10, top: 0, right: 20, bottom: 10 })).toBe(false);
    expect(overlaps(a, { left: 0, top: 10, right: 10, bottom: 20 })).toBe(false);
  });

  it("spike box is the bottom half of the cell, 2 px in from each side", () => {
    const box = spikeBox({ col: 51, row: 11 });
    expect(box).toEqual({ left: 920, top: 207, right: 934, bottom: 216 });
    const player = (right: number) => ({ left: right - 14, top: 196, right, bottom: 216 });
    expect(overlaps(player(920), box)).toBe(false);
    expect(overlaps(player(921), box)).toBe(true);
  });

  it("item and spring boxes", () => {
    expect(itemBox({ col: 8, row: 10 })).toEqual({ left: 147, top: 183, right: 159, bottom: 195 });
    expect(springBox({ col: 40, row: 11 })).toEqual({
      left: 721,
      top: 207,
      right: 737,
      bottom: 216,
    });
  });

  it("pushes away from the hazard, or against the facing when on top", () => {
    expect(knockbackDirection(900, 927, 1)).toBe(-1);
    expect(knockbackDirection(950, 927, 1)).toBe(1);
    expect(knockbackDirection(927, 927, 1)).toBe(-1);
    expect(knockbackDirection(927, 927, -1)).toBe(1);
  });

  it("finds the cells holding some GIDs", () => {
    expect(cellsWith([0, 0, 0, 22, 69, 0], 3, [69])).toEqual([{ col: 1, row: 1 }]);
  });
});
