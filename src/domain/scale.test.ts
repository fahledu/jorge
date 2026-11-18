import { describe, expect, it } from "vitest";
import { computeScale, GAME_HEIGHT, GAME_WIDTH } from "./scale";

describe("computeScale", () => {
  it("fills 1920×1080 at exactly 4×", () => {
    expect(computeScale(1920, 1080)).toEqual({
      scale: 4,
      width: 1920,
      height: 1080,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it("uses 2× in 1366×768, centered with bands", () => {
    expect(computeScale(1366, 768)).toEqual({
      scale: 2,
      width: 960,
      height: 540,
      offsetX: 203,
      offsetY: 114,
    });
  });

  it("fits a phone in landscape (844×390) with a fractional scale and full height", () => {
    const result = computeScale(844, 390);
    expect(result.scale).toBeCloseTo(390 / 270, 10);
    expect(result).toMatchObject({ width: 693, height: 390, offsetX: 75, offsetY: 0 });
  });

  it("snaps to 2 exactly at 960×540", () => {
    expect(computeScale(960, 540)).toMatchObject({ scale: 2, width: 960, height: 540 });
  });

  it("stays fractional just below 2× (959×540)", () => {
    const { scale, width, height } = computeScale(959, 540);
    expect(scale).toBeLessThan(2);
    expect(Number.isInteger(scale)).toBe(false);
    expect(width).toBeLessThanOrEqual(959);
    expect(height).toBeLessThanOrEqual(540);
  });

  it("keeps the native size at 480×270", () => {
    expect(computeScale(480, 270)).toEqual({
      scale: 1,
      width: 480,
      height: 270,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it("limits by width in a tall view", () => {
    expect(computeScale(1000, 2000)).toMatchObject({
      scale: 2,
      width: 960,
      height: 540,
      offsetX: 20,
      offsetY: 730,
    });
  });

  it("never exceeds the view, whatever the size", () => {
    for (let w = 1; w <= 2000; w += 37) {
      for (let h = 1; h <= 1200; h += 29) {
        const r = computeScale(w, h);
        expect(r.width).toBeLessThanOrEqual(w);
        expect(r.height).toBeLessThanOrEqual(h);
        expect(r.offsetX).toBeGreaterThanOrEqual(0);
        expect(r.offsetY).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it.each([
    [0, 0],
    [-10, 500],
    [800, 0],
    [Number.NaN, 400],
    [800, Number.POSITIVE_INFINITY],
  ])("falls back to 1× for an unusable view (%s×%s)", (w, h) => {
    expect(computeScale(w, h)).toEqual({
      scale: 1,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      offsetX: 0,
      offsetY: 0,
    });
  });
});
