// Physics constants (ADR 0004) and the jump model the level validator uses (ADR 0005).
//
// What the simulation reproduces, checked in Phaser 3.90 (`physics/arcade/World.js` and
// `Body.js`), fixed step of 1/PHYSICS_FPS s:
//   1. Body.update: `vy += gravity × dt` (World.computeVelocity), then `y += vy × dt`
//      (semi-implicit Euler). The body's own velocity cap is left at Phaser's default,
//      because it clamps both directions and would cut the jump: the fall cap is applied
//      by `stepMovement` instead.
//   2. Colliders separate the body from the tiles (sets `blocked.down`).
//   3. WORLD_STEP is emitted: the scene runs `stepMovement`, whose `vx`/`vy` are used by
//      the next step's Body.update.

import { initialMovement, stepMovement } from "./movement.ts";
import { MAP_HEIGHT, TILE_SIZE } from "./tmj.ts";

/** Physics steps per second, whatever the monitor's refresh rate. */
export const PHYSICS_FPS = 60;
/** Duration of one physics step, in ms. */
export const STEP_MS = 1000 / PHYSICS_FPS;
/** Px/s². */
export const GRAVITY = 1000;
/** Horizontal speed, px/s, the same on the ground and in the air. */
export const RUN_SPEED = 110;
/** Upward speed at take-off, px/s. */
export const JUMP_SPEED = 410;
/** Releasing the jump while rising faster than this cuts the speed to it (variable jump). */
export const JUMP_CUT_SPEED = 200;
/** Fall speed cap, px/s: 6 px per step, under half a tile, so the body never tunnels. */
export const MAX_FALL_SPEED = 360;
/** A jump still works this long after walking off a ledge. */
export const COYOTE_MS = 100;
/** A jump pressed this long before landing happens on landing. */
export const JUMP_BUFFER_MS = 100;
/** Push away from a spike, px/s: sideways and upwards (plan 1d). */
export const KNOCKBACK_SPEED_X = 160;
export const KNOCKBACK_SPEED_Y = 250;
/** Control is locked this long after a push, so the push is not undone at once. */
export const KNOCKBACK_MS = 250;
/** Upward speed a spring gives, px/s (about 7 tiles high). */
export const SPRING_SPEED = 520;
/** Upward speed after stomping an enemy, px/s (about 2.5 tiles; plan 1e). */
export const STOMP_BOUNCE_SPEED = 300;
/** Player's collision box inside its 24×24 frame, flush with the bottom of the frame. */
export const PLAYER_BODY = { width: 14, height: 20, frameSize: 24 } as const;

export interface JumpOptions {
  /** Running right during the jump. */
  run: boolean;
  /** Steps the jump stays held, counting the take-off step; held to the end if omitted. */
  holdSteps?: number;
}

export interface JumpResult {
  /** Highest point of the feet above the take-off ground, px. */
  maxRisePx: number;
  /** Horizontal distance covered while in the air, px. */
  airDistancePx: number;
  /** Steps in the air, from take-off until the feet are back at take-off height. */
  airSteps: number;
}

/** A jump from flat ground with no ceiling, stepped like the engine does. */
export function simulateJump(options: JumpOptions): JumpResult {
  const dt = STEP_MS / 1000;
  const held = (step: number): boolean =>
    options.holdSteps === undefined || step < options.holdSteps;
  const run = { left: false, right: options.run };

  // Step 0: standing still on the ground, the jump is pressed.
  let control = stepMovement(
    initialMovement(),
    { ...run, jump: true, jumpPressed: true, onGround: true, vy: 0 },
    STEP_MS,
  );
  let vy = control.vy;
  let vx = control.vx;
  let y = 0; // feet height relative to the ground, positive downwards
  let x = 0;
  let maxRise = 0;
  let steps = 0;
  // A safety cap: a valid jump lands in well under 10 s.
  while (steps < PHYSICS_FPS * 10) {
    steps += 1;
    vy += GRAVITY * dt;
    y += vy * dt;
    x += vx * dt;
    maxRise = Math.max(maxRise, -y);
    if (y >= 0 && vy > 0) break;
    control = stepMovement(
      control.state,
      { ...run, jump: held(steps), jumpPressed: false, onGround: false, vy },
      STEP_MS,
    );
    vy = control.vy;
    vx = control.vx;
  }
  return { maxRisePx: maxRise, airDistancePx: x, airSteps: steps };
}

export interface JumpReach {
  heightTiles: number;
  gapTiles: number;
}

/**
 * Held, running jump in tiles, without adding the body's width (conservative): the basis
 * of the reach limits of the level validator (ADR 0005), which ignores coyote and buffer.
 */
export function jumpReach(): JumpReach {
  const jump = simulateJump({ run: true });
  return { heightTiles: jump.maxRisePx / TILE_SIZE, gapTiles: jump.airDistancePx / TILE_SIZE };
}

/**
 * Height a spring launch reaches, in tiles: from `vy = −SPRING_SPEED`, with no control and
 * no cut, stepped like `simulateJump`.
 */
export function springRise(): { heightTiles: number } {
  const dt = STEP_MS / 1000;
  let vy = -SPRING_SPEED;
  let y = 0;
  let maxRise = 0;
  while (vy < 0) {
    vy += GRAVITY * dt;
    y += vy * dt;
    maxRise = Math.max(maxRise, -y);
  }
  return { heightTiles: maxRise / TILE_SIZE };
}

/** The body has left the map through the bottom (death by falling, ADR 0006). */
export function isBelowMap(bodyTop: number): boolean {
  return bodyTop >= MAP_HEIGHT * TILE_SIZE;
}
