// The death effect (plan 1d, decision 14): the player turns into a little angel and
// floats up off the screen before the level restarts. Pure: the scene only draws the pose.
import { PLAYER_BODY } from "./physics.ts";

/** Still at the place of death before rising, ms. */
export const DEATH_HOLD_MS = 300;
/** Rising speed, px/s. */
export const DEATH_RISE_SPEED = 120;
/** Side sway while rising, px each way, over a cycle of `DEATH_SWAY_MS`. */
export const DEATH_SWAY_PX = 4;
export const DEATH_SWAY_MS = 1000;
/** The wings go up and down every this many ms (2 flaps per second). */
export const DEATH_FLAP_MS = 250;
/** With "reduce effects": no motion, fades out in this long after the hold, ms. */
export const DEATH_FADE_MS = 600;

export interface DeathPose {
  /** Offset from the place of death, whole px (dy negative is up). */
  dx: number;
  dy: number;
  alpha: number;
  wingsUp: boolean;
}

/** Rounds to a whole px, without −0. */
function whole(value: number): number {
  return Math.round(value) + 0;
}

export function deathPose(elapsedMs: number, reduceEffects: boolean): DeathPose {
  const moving = Math.max(0, elapsedMs - DEATH_HOLD_MS);
  if (reduceEffects) {
    const alpha = Math.max(0, 1 - moving / DEATH_FADE_MS);
    return { dx: 0, dy: 0, alpha, wingsUp: false };
  }
  const dy = whole((-moving * DEATH_RISE_SPEED) / 1000);
  const dx = whole(DEATH_SWAY_PX * Math.sin((2 * Math.PI * moving) / DEATH_SWAY_MS));
  const wingsUp = Math.floor(elapsedMs / DEATH_FLAP_MS) % 2 === 1;
  return { dx, dy, alpha: 1, wingsUp };
}

/**
 * The effect is over: the whole angel (the player's frame; wings and halo sit inside or
 * above it) has left the top of the screen, or the fade has ended. `startTop` is the top
 * of the player's frame at the place of death, in screen px.
 */
export function deathFinished(
  elapsedMs: number,
  startTop: number,
  reduceEffects: boolean,
): boolean {
  if (reduceEffects) return elapsedMs >= DEATH_HOLD_MS + DEATH_FADE_MS;
  return startTop + deathPose(elapsedMs, false).dy + PLAYER_BODY.frameSize <= 0;
}
