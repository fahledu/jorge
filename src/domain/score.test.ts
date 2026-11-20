import { describe, expect, it } from "vitest";
import type { AttemptEvent } from "./attempt.ts";
import { STEP_MS } from "./physics.ts";
import {
  bestScore,
  runningPoints,
  scoreSummary,
  timeBonus,
  totalScore,
  usedSeconds,
} from "./score.ts";

const coin: AttemptEvent = { type: "coin" };
const walker: AttemptEvent = { type: "enemyDefeated", enemy: "walker" };
const flyer: AttemptEvent = { type: "enemyDefeated", enemy: "flyer" };
const completed: AttemptEvent = { type: "completed" };
const times = (n: number, event: AttemptEvent) => Array.from({ length: n }, () => event);

describe("edge cases of ADR 0006", () => {
  const level1 = { levelNumber: 1, targetTimeSeconds: 25 };
  const events = [...times(2, walker), ...times(5, coin), completed];

  it("level 1 in 30 s, target 25, 2 walkers, 5 coins → 760", () => {
    const summary = scoreSummary(events, level1, 30_000);
    expect(summary.walkers).toEqual({ count: 2, points: 200 });
    expect(summary.coins).toEqual({ count: 5, points: 50 });
    expect(summary.completion.points).toBe(510);
    expect(summary.timeBonus.points).toBe(0);
    expect(summary.total).toBe(760);
  });

  it("the same level in 20.9 s → bonus 50, 810; the best and the total go up by 50", () => {
    const summary = scoreSummary(events, level1, 20_900);
    expect(summary.timeBonus).toEqual({ usedSeconds: 20, targetSeconds: 25, points: 50 });
    expect(summary.total).toBe(810);
    const before = bestScore(null, 760);
    expect(before).toBe(760);
    const after = bestScore(before, 810);
    expect(after).toBe(810);
    expect(totalScore([after ?? 0]) - totalScore([before ?? 0])).toBe(50);
  });

  it("700 afterwards keeps the best at 810 and the total", () => {
    expect(bestScore(810, 700)).toBe(810);
    expect(totalScore([bestScore(810, 700) ?? 0])).toBe(810);
  });

  it("3 enemies and a fall: no points, the best is unchanged", () => {
    expect(bestScore(810, null)).toBe(810);
    expect(bestScore(null, null)).toBeNull();
    expect(() => scoreSummary(times(3, walker), level1, 9000)).toThrow(/completed/);
  });

  it("level 100 completed after the target, no events → 1500", () => {
    const summary = scoreSummary([completed], { levelNumber: 100, targetTimeSeconds: 10 }, 60_000);
    expect(summary.total).toBe(1500);
  });

  it("the total sums the best of each level", () => {
    expect(totalScore([])).toBe(0);
    expect(totalScore([810, 1500])).toBe(2310);
  });
});

describe("time bonus", () => {
  it("is 0 on the target, 10 just under it and full at 0 ms", () => {
    expect(timeBonus(25, 25_000)).toBe(0);
    expect(timeBonus(25, 24_999)).toBe(10);
    expect(timeBonus(25, 0)).toBe(250);
  });

  it("1200 steps of 1000/60 ms are 20 whole seconds", () => {
    let elapsed = 0;
    for (let i = 0; i < 1200; i += 1) elapsed += STEP_MS;
    expect(usedSeconds(elapsed)).toBe(20);
  });
});

describe("runningPoints", () => {
  it("2 walkers, 1 flyer and 3 coins → 430, and the flag adds nothing", () => {
    const events = [...times(2, walker), flyer, ...times(3, coin)];
    expect(runningPoints(events)).toBe(430);
    expect(runningPoints([...events, completed])).toBe(430);
    expect(runningPoints([])).toBe(0);
  });
});

describe("level 1 played by hand (plan 1f)", () => {
  it("2 walkers, 1 flyer, 4 coins in 32.6 s, target 45 → 1080", () => {
    const events = [walker, coin, coin, walker, flyer, coin, coin, completed];
    const summary = scoreSummary(events, { levelNumber: 1, targetTimeSeconds: 45 }, 32_600);
    expect(summary.walkers.points).toBe(200);
    expect(summary.flyers).toEqual({ count: 1, points: 200 });
    expect(summary.coins.points).toBe(40);
    expect(summary.completion).toEqual({ levelNumber: 1, points: 510 });
    expect(summary.timeBonus).toEqual({ usedSeconds: 32, targetSeconds: 45, points: 130 });
    expect(summary.elapsedMs).toBe(32_600);
    expect(summary.total).toBe(1080);
  });
});
