import { describe, expect, it } from "vitest";
import { initialMovement, stepMovement } from "./movement.ts";
import {
  GRAVITY,
  isBelowMap,
  JUMP_SPEED,
  jumpReach,
  MAX_FALL_SPEED,
  PHYSICS_FPS,
  SPRING_SPEED,
  STEP_MS,
  simulateJump,
  springRise,
} from "./physics.ts";

describe("jump reach (roadmap 1c, ADR 0005)", () => {
  it("held jump rises at least 4 tiles and less than 5", () => {
    const { heightTiles } = jumpReach();
    expect(heightTiles).toBeGreaterThanOrEqual(4);
    expect(heightTiles).toBeLessThan(5);
  });

  it("held running jump crosses at least 4 tiles", () => {
    expect(jumpReach().gapTiles).toBeGreaterThanOrEqual(4);
  });

  it("a tap gives a low jump of 1 to 2 tiles", () => {
    const { maxRisePx } = simulateJump({ run: true, holdSteps: 1 });
    expect(maxRisePx).toBeGreaterThanOrEqual(18);
    expect(maxRisePx).toBeLessThanOrEqual(36);
  });

  it("standing jump covers no horizontal distance and lands", () => {
    const jump = simulateJump({ run: false });
    expect(jump.airDistancePx).toBe(0);
    expect(jump.airSteps).toBeLessThan(PHYSICS_FPS);
  });
});

describe("step sizes", () => {
  it("no step moves the body half a tile or more", () => {
    expect(MAX_FALL_SPEED / PHYSICS_FPS).toBeLessThan(9);
    expect(JUMP_SPEED / PHYSICS_FPS).toBeLessThan(9);
  });

  it("a long fall never passes the fall cap", () => {
    let state = initialMovement();
    let vy = 0;
    for (let step = 0; step < PHYSICS_FPS * 5; step += 1) {
      vy += (GRAVITY * STEP_MS) / 1000;
      const control = stepMovement(
        state,
        { left: false, right: false, jump: false, jumpPressed: false, onGround: false, vy },
        STEP_MS,
      );
      state = control.state;
      vy = control.vy;
      expect(vy).toBeLessThanOrEqual(MAX_FALL_SPEED);
    }
    expect(vy).toBe(MAX_FALL_SPEED);
  });
});

describe("isBelowMap", () => {
  it("is true only once the top of the body reaches the bottom of the map", () => {
    expect(isBelowMap(269.9)).toBe(false);
    expect(isBelowMap(270)).toBe(true);
  });
});

describe("springRise (plan 1d)", () => {
  it("reaches 6 to 8 tiles, above the jump and the 5-tile platform of level 1", () => {
    const { heightTiles } = springRise();
    expect(heightTiles).toBeGreaterThanOrEqual(6);
    expect(heightTiles).toBeLessThan(8);
    expect(heightTiles).toBeGreaterThan(jumpReach().heightTiles);
  });

  it("moves less than half a tile per step", () => {
    expect(SPRING_SPEED / PHYSICS_FPS).toBeLessThan(9);
  });
});
