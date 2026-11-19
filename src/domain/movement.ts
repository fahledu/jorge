// Player control, applied once per physics step (see physics.ts for the step order).
import {
  COYOTE_MS,
  JUMP_BUFFER_MS,
  JUMP_CUT_SPEED,
  JUMP_SPEED,
  MAX_FALL_SPEED,
  RUN_SPEED,
} from "./physics.ts";

/** Tolerance for timers counted down in steps of 1000/60 ms. */
const EPSILON_MS = 1e-6;

export interface MovementState {
  /** Time left to jump after leaving the ground, ms. */
  coyoteMs: number;
  /** Time left for a jump pressed in the air to happen on landing, ms. */
  bufferMs: number;
}

export interface MovementInput {
  left: boolean;
  right: boolean;
  /** The jump is held. */
  jump: boolean;
  /** The jump was pressed since the last step. */
  jumpPressed: boolean;
  /** Standing on something solid after this step's collisions. */
  onGround: boolean;
  /** Current vertical speed of the body, px/s, positive downwards. */
  vy: number;
}

export interface MovementStep {
  state: MovementState;
  /** Speeds the body must have for the next step, px/s. */
  vx: number;
  vy: number;
}

export function initialMovement(): MovementState {
  return { coyoteMs: 0, bufferMs: 0 };
}

export function stepMovement(
  state: MovementState,
  input: MovementInput,
  dtMs: number,
): MovementStep {
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const vx = direction * RUN_SPEED;

  const coyoteMs = input.onGround ? COYOTE_MS : Math.max(0, state.coyoteMs - dtMs);
  const bufferMs = input.jumpPressed ? JUMP_BUFFER_MS : Math.max(0, state.bufferMs - dtMs);

  if (bufferMs > EPSILON_MS && coyoteMs > EPSILON_MS) {
    return { state: { coyoteMs: 0, bufferMs: 0 }, vx, vy: -JUMP_SPEED };
  }

  let vy = input.vy;
  if (!input.jump && vy < -JUMP_CUT_SPEED) vy = -JUMP_CUT_SPEED;
  if (vy > MAX_FALL_SPEED) vy = MAX_FALL_SPEED;
  return { state: { coyoteMs, bufferMs }, vx, vy };
}
