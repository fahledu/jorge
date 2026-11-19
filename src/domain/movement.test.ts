import { describe, expect, it } from "vitest";
import {
  initialMovement,
  type MovementInput,
  type MovementState,
  stepMovement,
} from "./movement.ts";
import { JUMP_SPEED, RUN_SPEED, STEP_MS } from "./physics.ts";

const idle: MovementInput = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
  onGround: false,
  vy: 0,
};

function step(state: MovementState, input: Partial<MovementInput>) {
  return stepMovement(state, { ...idle, ...input }, STEP_MS);
}

/** Runs `steps` steps with the same input and returns the last state. */
function repeat(state: MovementState, steps: number, input: Partial<MovementInput>) {
  let current = state;
  for (let i = 0; i < steps; i += 1) current = step(current, input).state;
  return current;
}

describe("horizontal speed", () => {
  it.each([
    [{ right: true }, RUN_SPEED],
    [{ left: true }, -RUN_SPEED],
    [{ left: true, right: true }, 0],
    [{}, 0],
  ])("%o → vx %d", (input, vx) => {
    expect(step(initialMovement(), input).vx).toBe(vx);
  });
});

describe("jump", () => {
  it("jumps from the ground on a press", () => {
    const result = step(initialMovement(), { onGround: true, jump: true, jumpPressed: true });
    expect(result.vy).toBe(-JUMP_SPEED);
  });

  it("cuts the speed when released while rising fast", () => {
    expect(step(initialMovement(), { vy: -393 }).vy).toBe(-200);
  });

  it("keeps a slow rise or a fall when released", () => {
    expect(step(initialMovement(), { vy: -150 }).vy).toBe(-150);
    expect(step(initialMovement(), { vy: 50 }).vy).toBe(50);
  });

  it("keeps the speed while the jump is held", () => {
    expect(step(initialMovement(), { jump: true, vy: -393 }).vy).toBe(-393);
  });
});

describe("coyote time", () => {
  const leftGround = (offGroundSteps: number) => {
    const onGround = step(initialMovement(), { onGround: true }).state;
    const before = repeat(onGround, offGroundSteps - 1, { vy: 50 });
    return step(before, { jump: true, jumpPressed: true, vy: 50 });
  };

  it("jumps 5 steps (83 ms) after leaving the ground", () => {
    expect(leftGround(5).vy).toBe(-JUMP_SPEED);
  });

  it("does not jump 6 or 7 steps after leaving the ground", () => {
    expect(leftGround(6).vy).toBe(50);
    expect(leftGround(7).vy).toBe(50);
  });
});

describe("jump buffer", () => {
  const pressedBeforeLanding = (steps: number) => {
    const pressed = step(initialMovement(), { jump: true, jumpPressed: true, vy: 100 }).state;
    const falling = repeat(pressed, steps - 1, { jump: true, vy: 100 });
    return step(falling, { jump: true, onGround: true, vy: 0 });
  };

  it("jumps on landing when pressed 5 steps before", () => {
    expect(pressedBeforeLanding(5).vy).toBe(-JUMP_SPEED);
  });

  it("does not jump when pressed 6 or 7 steps before", () => {
    expect(pressedBeforeLanding(6).vy).toBe(0);
    expect(pressedBeforeLanding(7).vy).toBe(0);
  });
});

describe("no extra jumps", () => {
  it("a jump held from take-off to landing does not jump again", () => {
    let state = step(initialMovement(), { onGround: true, jump: true, jumpPressed: true }).state;
    state = repeat(state, 40, { jump: true, vy: -100 });
    expect(step(state, { jump: true, onGround: true, vy: 0 }).vy).toBe(0);
  });

  it("a second press right after jumping does not jump in the air", () => {
    const jumped = step(initialMovement(), { onGround: true, jump: true, jumpPressed: true });
    const released = step(jumped.state, { vy: -380 }).state;
    expect(step(released, { jump: true, jumpPressed: true, vy: -360 }).vy).toBe(-360);
  });
});
