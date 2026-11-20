// What the HUD shows, as text (plan 1f, decision 4); the scene draws it with the digits of
// the pack and redraws a field only when its text changes.
import type { AttemptState } from "./attempt.ts";
import { EPSILON_MS } from "./physics.ts";
import { runningPoints } from "./score.ts";

/** Points on the HUD: zeros on the left, no thousands separator (the pack has no dot). */
const POINTS_DIGITS = 6;

export interface ClockParts {
  minutes: number;
  seconds: number;
  /** Tenths, truncated: never shows a time below the one that gave the bonus. */
  tenths: number;
}

export function clockParts(ms: number): ClockParts {
  const totalTenths = Math.floor((ms + EPSILON_MS) / 100);
  const totalSeconds = Math.floor(totalTenths / 10);
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
    tenths: totalTenths % 10,
  };
}

/** `m:ss`: minutes without a leading zero, seconds with two digits. */
export function clockText(ms: number): string {
  const { minutes, seconds } = clockParts(ms);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export interface HudFields {
  hearts: number;
  coins: string;
  points: string;
  clock: string;
  level: string;
}

export function hudFields(state: AttemptState, levelNumber: number): HudFields {
  return {
    hearts: state.hearts,
    coins: String(state.coins),
    points: String(runningPoints(state.events)).padStart(POINTS_DIGITS, "0"),
    clock: clockText(state.elapsedMs),
    level: String(levelNumber),
  };
}
