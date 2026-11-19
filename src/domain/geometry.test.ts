import { describe, expect, it } from "vitest";
import { cellOf, feetIn, flagZone, overlaps } from "./geometry.ts";

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
});
