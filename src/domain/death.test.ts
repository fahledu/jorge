import { describe, expect, it } from "vitest";
import { DEATH_SWAY_PX, deathFinished, deathPose } from "./death.ts";
import { STEP_MS } from "./physics.ts";

describe("death pose", () => {
  it("holds still for 300 ms, then rises at 120 px/s", () => {
    expect(deathPose(0, false).dy).toBe(0);
    expect(deathPose(299, false).dy).toBe(0);
    expect(deathPose(1300, false).dy).toBe(-120);
  });

  it("sways within ±4 px, and not at all with reduce effects", () => {
    for (let ms = 0; ms < 3000; ms += STEP_MS) {
      expect(Math.abs(deathPose(ms, false).dx)).toBeLessThanOrEqual(DEATH_SWAY_PX);
      expect(deathPose(ms, true)).toMatchObject({ dx: 0, dy: 0, wingsUp: false });
    }
    expect(deathPose(550, false).dx).toBe(DEATH_SWAY_PX);
  });

  it("flaps at most 4 times a second", () => {
    let changes = 0;
    let last = deathPose(0, false).wingsUp;
    for (let i = 1; i <= 60; i += 1) {
      const flipped = deathPose(i * STEP_MS, false).wingsUp;
      if (flipped !== last) changes += 1;
      last = flipped;
    }
    expect(changes).toBeLessThanOrEqual(4);
  });

  it("keeps full opacity, or fades from 1 to 0 in 600 ms with reduce effects", () => {
    expect(deathPose(2000, false).alpha).toBe(1);
    expect(deathPose(300, true).alpha).toBe(1);
    expect(deathPose(600, true).alpha).toBeCloseTo(0.5);
    expect(deathPose(900, true).alpha).toBe(0);
  });
});

describe("death finished", () => {
  it("ends once the frame is above the screen", () => {
    // Frame top at 192 (feet on row 12): 216 px to rise, 1.8 s after the hold.
    expect(deathFinished(2090, 192, false)).toBe(false);
    expect(deathFinished(2100, 192, false)).toBe(true);
  });

  it("ends after the fade with reduce effects", () => {
    expect(deathFinished(899, 192, true)).toBe(false);
    expect(deathFinished(900, 192, true)).toBe(true);
  });
});
