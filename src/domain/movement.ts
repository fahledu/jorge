// Player control, applied once per physics step (see physics.ts for the step order).
import {
  COYOTE_MS,
  JUMP_BUFFER_MS,
  JUMP_CUT_SPEED,
  JUMP_SPEED,
  KNOCKBACK_MS,
  KNOCKBACK_SPEED_X,
  KNOCKBACK_SPEED_Y,
  MAX_FALL_SPEED,
  RUN_SPEED,
  SPRING_SPEED,
  STOMP_BOUNCE_SPEED,
} from "./physics.ts";

/** Tolerance for timers counted down in steps of 1000/60 ms. */
const EPSILON_MS = 1e-6;

export interface MovementState {
  /** Time left to jump after leaving the ground, ms. */
  coyoteMs: number;
  /** Time left for a jump pressed in the air to happen on landing, ms. */
  bufferMs: number;
  /** Time left with the control locked after a push, ms. */
  lockMs: number;
  /** Horizontal speed kept while the control is locked, px/s. */
  lockVx: number;
  /** The rise came from the player's jump, so releasing the jump cuts it. */
  cuttable: boolean;
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
  return { coyoteMs: 0, bufferMs: 0, lockMs: 0, lockVx: 0, cuttable: false };
}

export function stepMovement(
  state: MovementState,
  input: MovementInput,
  dtMs: number,
): MovementStep {
  const coyoteMs = input.onGround ? COYOTE_MS : Math.max(0, state.coyoteMs - dtMs);
  let vy = input.vy;
  if (vy > MAX_FALL_SPEED) vy = MAX_FALL_SPEED;

  // The push itself took the first step of the lock.
  const lockMs = Math.max(0, state.lockMs - dtMs);
  if (lockMs > EPSILON_MS) {
    // Pushed: the push keeps its speed and jumps pressed now are dropped, not buffered.
    return {
      state: { ...state, coyoteMs, bufferMs: 0, lockMs },
      vx: state.lockVx,
      vy,
    };
  }

  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const vx = direction * RUN_SPEED;
  const bufferMs = input.jumpPressed ? JUMP_BUFFER_MS : Math.max(0, state.bufferMs - dtMs);

  if (bufferMs > EPSILON_MS && coyoteMs > EPSILON_MS) {
    return {
      state: { coyoteMs: 0, bufferMs: 0, lockMs: 0, lockVx: 0, cuttable: true },
      vx,
      vy: -JUMP_SPEED,
    };
  }

  // Only a rise from the player's own jump is cut; it ends once the body falls.
  const cuttable = state.cuttable && vy < 0;
  if (cuttable && !input.jump && vy < -JUMP_CUT_SPEED) vy = -JUMP_CUT_SPEED;
  return { state: { coyoteMs, bufferMs, lockMs: 0, lockVx: 0, cuttable }, vx, vy };
}

/** Push away from a hazard (plan 1d, decision 3); control locked for `KNOCKBACK_MS`. */
export function knockback(direction: -1 | 1): MovementStep {
  const vx = direction * KNOCKBACK_SPEED_X;
  return {
    state: { coyoteMs: 0, bufferMs: 0, lockMs: KNOCKBACK_MS, lockVx: vx, cuttable: false },
    vx,
    vy: -KNOCKBACK_SPEED_Y,
  };
}

/** Spring launch (plan 1d, decision 5): no cut, no jump in the air; `vx` keeps `vx`. */
export function springBounce(vx: number): MovementStep {
  return {
    state: { coyoteMs: 0, bufferMs: 0, lockMs: 0, lockVx: 0, cuttable: false },
    vx,
    vy: -SPRING_SPEED,
  };
}

/** Bounce off a stomped enemy (plan 1e, decision 7): like the spring, lower. */
export function stompBounce(vx: number): MovementStep {
  return { ...springBounce(vx), vy: -STOMP_BOUNCE_SPEED };
}

/**
 * A spring launches a player that is not rising and was neither hurt nor bounced off an
 * enemy this step (ADR 0006: hurt, then stomp, then spring).
 */
export function springLaunches(vy: number, hurt: boolean, stomped: boolean): boolean {
  return !hurt && !stomped && vy >= 0;
}
