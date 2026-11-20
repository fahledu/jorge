// Points of an attempt, from its list of events (ADR 0006). The scene and the DOM only show
// what these functions return; no scoring number lives anywhere else.
import type { AttemptEvent } from "./attempt.ts";
import type { EnemyType } from "./enemies.ts";
import { EPSILON_MS } from "./physics.ts";

export const POINTS = { walker: 100, flyer: 200, coin: 10 } as const satisfies Record<
  EnemyType | "coin",
  number
>;
export const COMPLETION_BASE = 500;
export const COMPLETION_PER_LEVEL = 10;
export const TIME_BONUS_PER_SECOND = 10;
/** Whole seconds used: 1200 steps of 1000/60 ms are 20, not 19. */
export function usedSeconds(elapsedMs: number): number {
  return Math.floor((elapsedMs + EPSILON_MS) / 1000);
}

export function completionPoints(levelNumber: number): number {
  return COMPLETION_BASE + COMPLETION_PER_LEVEL * levelNumber;
}

export function timeBonus(targetTimeSeconds: number, elapsedMs: number): number {
  return TIME_BONUS_PER_SECOND * Math.max(0, targetTimeSeconds - usedSeconds(elapsedMs));
}

function eventPoints(event: AttemptEvent): number {
  if (event.type === "coin") return POINTS.coin;
  if (event.type === "enemyDefeated") return POINTS[event.enemy];
  return 0;
}

/** Points of enemies and coins so far, without completion or bonus (HUD and pause). */
export function runningPoints(events: readonly AttemptEvent[]): number {
  let total = 0;
  for (const event of events) total += eventPoints(event);
  return total;
}

export interface ScoreLine {
  count: number;
  points: number;
}

export interface ScoreSummary {
  walkers: ScoreLine;
  flyers: ScoreLine;
  coins: ScoreLine;
  completion: { levelNumber: number; points: number };
  timeBonus: { usedSeconds: number; targetSeconds: number; points: number };
  elapsedMs: number;
  total: number;
}

export interface ScoredLevel {
  levelNumber: number;
  targetTimeSeconds: number;
}

/** The summary of a completed attempt; points only exist with the level completed. */
export function scoreSummary(
  events: readonly AttemptEvent[],
  level: ScoredLevel,
  elapsedMs: number,
): ScoreSummary {
  if (!events.some((e) => e.type === "completed")) {
    throw new Error("an attempt scores only when the level is completed");
  }
  const count = (match: (e: AttemptEvent) => boolean) => events.filter(match).length;
  const line = (n: number, each: number): ScoreLine => ({ count: n, points: n * each });
  const walkers = line(
    count((e) => e.type === "enemyDefeated" && e.enemy === "walker"),
    POINTS.walker,
  );
  const flyers = line(
    count((e) => e.type === "enemyDefeated" && e.enemy === "flyer"),
    POINTS.flyer,
  );
  const coins = line(
    count((e) => e.type === "coin"),
    POINTS.coin,
  );
  const completion = {
    levelNumber: level.levelNumber,
    points: completionPoints(level.levelNumber),
  };
  const bonus = {
    usedSeconds: usedSeconds(elapsedMs),
    targetSeconds: level.targetTimeSeconds,
    points: timeBonus(level.targetTimeSeconds, elapsedMs),
  };
  return {
    walkers,
    flyers,
    coins,
    completion,
    timeBonus: bonus,
    elapsedMs,
    total: walkers.points + flyers.points + coins.points + completion.points + bonus.points,
  };
}

/** Best score of a level; `null` = no record yet / attempt not completed (ADR 0006). */
export function bestScore(previous: number | null, attempt: number | null): number | null {
  if (attempt === null) return previous;
  if (previous === null) return attempt;
  return Math.max(previous, attempt);
}

/** Total = sum of the best score of each level (ADR 0006). */
export function totalScore(bests: readonly number[]): number {
  let total = 0;
  for (const best of bests) total += best;
  return total;
}
