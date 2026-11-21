import { describe, expect, it } from "vitest";
import {
  defeatFinished,
  defeatPose,
  ENEMY_BOX,
  enemyBox,
  initialPatrol,
  isStomp,
  isStompable,
  patrolAxis,
  patrolRange,
  scoredAs,
  stepPatrol,
} from "./enemies.ts";
import { MAX_FALL_SPEED, PHYSICS_FPS, STEP_MS } from "./physics.ts";
import { MAP_HEIGHT } from "./tmj.ts";

const GROUND = 23;
const SPIKE = 69;

function terrain(width: number, cells: [number, number, number][]): number[] {
  const data = new Array<number>(width * MAP_HEIGHT).fill(0);
  for (const [col, row, gid] of cells) data[row * width + col] = gid;
  return data;
}

function ground(cols: number[], row = 12): [number, number, number][] {
  return cols.map((col) => [col, row, GROUND]);
}

const span = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe("patrolRange: walker", () => {
  const cell = { col: 4, row: 11 };
  it("turns at the edges of the ground", () => {
    expect(patrolRange("walker", cell, terrain(10, ground(span(2, 7))), 10)).toEqual({
      min: 44,
      max: 136,
    });
  });
  it("turns at a wall", () => {
    const map = terrain(10, [...ground(span(2, 7)), [6, 11, GROUND]]);
    expect(patrolRange("walker", cell, map, 10).max).toBe(100);
  });
  it("does not walk over a spike", () => {
    const map = terrain(10, [...ground(span(2, 7)), [3, 11, SPIKE]]);
    expect(patrolRange("walker", cell, map, 10).min).toBe(80);
  });
  it("does not walk onto a spike in the ground", () => {
    const map = terrain(10, [...ground([2, 4, 5, 6, 7]), [3, 12, SPIKE]]);
    expect(patrolRange("walker", cell, map, 10).min).toBe(80);
  });
  it("the edge of the map is a wall", () => {
    expect(patrolRange("walker", cell, terrain(10, ground(span(0, 9))), 10)).toEqual({
      min: 8,
      max: 172,
    });
  });
});

describe("patrolRange: flyer", () => {
  it("goes 3 cells each way in free air", () => {
    expect(patrolRange("flyer", { col: 5, row: 8 }, terrain(20, []), 20)).toEqual({
      min: 44,
      max: 154,
    });
  });
  it("stops before a wall and at the edge of the map", () => {
    const map = terrain(20, [[7, 8, GROUND]]);
    expect(patrolRange("flyer", { col: 5, row: 8 }, map, 20).max).toBe(118);
    expect(patrolRange("flyer", { col: 1, row: 8 }, terrain(20, []), 20).min).toBe(8);
  });
  it("stops before a spike", () => {
    const map = terrain(20, [[3, 8, SPIKE]]);
    expect(patrolRange("flyer", { col: 5, row: 8 }, map, 20).min).toBe(80);
  });
});

describe("stepPatrol", () => {
  const track = { min: 44, max: 136 };
  it("moves at its speed", () => {
    const next = stepPatrol({ pos: 50, direction: -1 }, track, 40, STEP_MS);
    expect(next.pos).toBeCloseTo(49.3333, 3);
    expect(next.direction).toBe(-1);
  });
  it("turns at the ends, reflecting the excess", () => {
    const left = stepPatrol({ pos: 44.2, direction: -1 }, track, 40, STEP_MS);
    expect(left.pos).toBeCloseTo(44.467, 3);
    expect(left.direction).toBe(1);
    const right = stepPatrol({ pos: 135.8, direction: 1 }, track, 40, STEP_MS);
    expect(right.pos).toBeCloseTo(135.533, 3);
    expect(right.direction).toBe(-1);
  });
  it("stays still on a one-cell range", () => {
    const next = stepPatrol({ pos: 80, direction: -1 }, { min: 80, max: 80 }, 40, STEP_MS);
    expect(next).toEqual({ pos: 80, direction: -1 });
  });
  it("starts going left, inside the range", () => {
    expect(initialPatrol(track, 81)).toEqual({ pos: 81, direction: -1 });
    expect(initialPatrol(track, 10).pos).toBe(44);
  });
});

describe("enemyBox", () => {
  it("a walker stands on the bottom of its cell", () => {
    expect(enemyBox("walker", 128, 11 * 18 + 9)).toEqual({
      left: 120,
      top: 202,
      right: 136,
      bottom: 216,
    });
  });
  it("a flyer is centred in its row", () => {
    expect(enemyBox("flyer", 166, 9 * 18 + 9)).toEqual({
      left: 158,
      top: 165,
      right: 174,
      bottom: 177,
    });
  });
});

describe("isStomp", () => {
  const enemy = { left: 120, top: 202, right: 136, bottom: 216 };
  const feet = (bottom: number) => ({ left: 121, top: bottom - 20, right: 135, bottom });
  it("falling with the feet in the top half", () => {
    expect(isStomp(feet(203), 300, enemy)).toBe(true);
    expect(isStomp(feet(209), 300, enemy)).toBe(true);
  });
  it("not below the middle, not when still or rising, not without touching", () => {
    expect(isStomp(feet(210), 300, enemy)).toBe(false);
    expect(isStomp(feet(203), 0, enemy)).toBe(false);
    expect(isStomp(feet(203), -100, enemy)).toBe(false);
    expect(isStomp(feet(202), 300, enemy)).toBe(false);
  });
  it("the fastest fall always meets the top half first (plan 1e, decision 3)", () => {
    const smallest = Math.min(...Object.values(ENEMY_BOX).map((box) => box.height));
    expect(MAX_FALL_SPEED / PHYSICS_FPS).toBeLessThanOrEqual(smallest / 2);
  });
});

describe("defeatPose", () => {
  it("hops and falls off the screen", () => {
    expect(defeatPose(0, false)).toEqual({ dy: 0, alpha: 1 });
    expect(defeatPose(150, false).dy).toBe(-11);
    expect(defeatPose(1000, false).dy).toBe(350);
  });
  it("with reduce effects, still and fading", () => {
    expect(defeatPose(0, true)).toEqual({ dy: 0, alpha: 1 });
    expect(defeatPose(150, true)).toEqual({ dy: 0, alpha: 0.5 });
    expect(defeatPose(300, true).alpha).toBe(0);
    expect(defeatPose(400, true).alpha).toBe(0);
  });
  it("finishes after 1000 ms, or 300 ms with reduce effects", () => {
    expect(defeatFinished(999, false)).toBe(false);
    expect(defeatFinished(1000, false)).toBe(true);
    expect(defeatFinished(299, true)).toBe(false);
    expect(defeatFinished(300, true)).toBe(true);
  });
});

describe("patrolRange: vertical flyer", () => {
  const open = terrain(20, []);
  it("goes 3 cells up and down in free air", () => {
    expect(patrolRange("flyer-v", { col: 5, row: 6 }, open, 20)).toEqual({ min: 60, max: 174 });
  });
  it("starts below a solid cell", () => {
    const map = terrain(20, [[5, 4, GROUND]]);
    expect(patrolRange("flyer-v", { col: 5, row: 6 }, map, 20).min).toBe(5 * 18 + 6);
  });
  it("stops at the top and at the last row", () => {
    expect(patrolRange("flyer-v", { col: 5, row: 1 }, open, 20).min).toBe(6);
    expect(patrolRange("flyer-v", { col: 5, row: 13 }, open, 20).max).toBe(15 * 18 - 6);
  });
  it("stops before a spike and stays still when boxed in", () => {
    const spike = terrain(20, [[5, 8, SPIKE]]);
    expect(patrolRange("flyer-v", { col: 5, row: 6 }, spike, 20).max).toBe(8 * 18 - 6);
    const boxed = terrain(20, [
      [5, 5, GROUND],
      [5, 7, GROUND],
    ]);
    const range = patrolRange("flyer-v", { col: 5, row: 6 }, boxed, 20);
    expect(range).toEqual({ min: 117, max: 117 });
    expect(stepPatrol(initialPatrol(range, 117), range, 50, STEP_MS).pos).toBe(117);
  });
  it("starts going up and turns at both ends", () => {
    const range = patrolRange("flyer-v", { col: 5, row: 6 }, open, 20);
    expect(initialPatrol(range, 117).direction).toBe(-1);
    expect(stepPatrol({ pos: 60.1, direction: -1 }, range, 50, STEP_MS).direction).toBe(1);
    expect(stepPatrol({ pos: 173.9, direction: 1 }, range, 50, STEP_MS).direction).toBe(-1);
  });
  it("its box follows y", () => {
    expect(enemyBox("flyer-v", 100, 100)).toEqual({ left: 92, top: 94, right: 108, bottom: 106 });
  });
});

describe("spiky", () => {
  it("has the same track as a walker on the same ground", () => {
    const map = terrain(10, ground(span(2, 7)));
    const cell = { col: 4, row: 11 };
    expect(patrolRange("spiky", cell, map, 10)).toEqual(patrolRange("walker", cell, map, 10));
    expect(enemyBox("spiky", 128, 207)).toEqual({ left: 120, top: 202, right: 136, bottom: 216 });
  });
  it("cannot be stomped; scores as nothing", () => {
    expect(isStompable("spiky")).toBe(false);
    expect(isStompable("walker") && isStompable("flyer") && isStompable("flyer-v")).toBe(true);
    expect(
      (["walker", "flyer", "flyer-v", "spiky"] as const).map((type) => scoredAs(type)),
    ).toEqual(["walker", "flyer", "flyer", null]);
    expect(patrolAxis("flyer-v")).toBe("y");
    expect(patrolAxis("spiky")).toBe("x");
  });
});
