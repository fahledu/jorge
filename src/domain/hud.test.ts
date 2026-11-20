import { describe, expect, it } from "vitest";
import { type AttemptState, initialAttempt } from "./attempt.ts";
import { clockParts, clockText, hudFields } from "./hud.ts";
import { STEP_MS } from "./physics.ts";

describe("clockParts", () => {
  it("splits minutes, seconds and truncated tenths", () => {
    expect(clockParts(42_850)).toEqual({ minutes: 0, seconds: 42, tenths: 8 });
    expect(clockParts(65_300)).toEqual({ minutes: 1, seconds: 5, tenths: 3 });
    expect(clockParts(20_960).tenths).toBe(9);
    expect(clockParts(0)).toEqual({ minutes: 0, seconds: 0, tenths: 0 });
  });

  it("turns the minute and the second only when they are reached", () => {
    expect(clockParts(59_999)).toEqual({ minutes: 0, seconds: 59, tenths: 9 });
    expect(clockParts(60_000)).toEqual({ minutes: 1, seconds: 0, tenths: 0 });
    expect(clockParts(999.9)).toEqual({ minutes: 0, seconds: 0, tenths: 9 });
    expect(clockParts(1000)).toEqual({ minutes: 0, seconds: 1, tenths: 0 });
    expect(clockText(59_999)).toBe("0:59");
    expect(clockText(60_000)).toBe("1:00");
  });

  it("1200 steps of 1000/60 ms are 20.0 s", () => {
    let elapsed = 0;
    for (let i = 0; i < 1200; i += 1) elapsed += STEP_MS;
    expect(clockParts(elapsed)).toEqual({ minutes: 0, seconds: 20, tenths: 0 });
  });
});

describe("clockText", () => {
  it("is m:ss", () => {
    expect(clockText(0)).toBe("0:00");
    expect(clockText(42_850)).toBe("0:42");
    expect(clockText(725_000)).toBe("12:05");
  });
});

describe("hudFields", () => {
  it("shows a new attempt as 3 hearts, 0, 000000, 0:00", () => {
    expect(hudFields(initialAttempt(), 1)).toEqual({
      hearts: 3,
      coins: "0",
      points: "000000",
      clock: "0:00",
      level: "1",
    });
  });

  it("shows the running points with zeros, the coins and the level without them", () => {
    const state: AttemptState = {
      ...initialAttempt(),
      coins: 6,
      events: [
        { type: "enemyDefeated", enemy: "walker" },
        { type: "enemyDefeated", enemy: "walker" },
        { type: "enemyDefeated", enemy: "flyer" },
        { type: "coin" },
        { type: "coin" },
        { type: "coin" },
      ],
      elapsedMs: 42_850,
    };
    expect(hudFields(state, 13)).toMatchObject({
      coins: "6",
      points: "000430",
      clock: "0:42",
      level: "13",
    });
  });
});
