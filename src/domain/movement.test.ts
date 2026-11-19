import { describe, expect, it } from "vitest";
import {
  initialMovement,
  knockback,
  type MovementInput,
  type MovementState,
  springBounce,
  springLaunches,
  stepMovement,
  stompBounce,
} from "./movement.ts";
import { JUMP_SPEED, RUN_SPEED, SPRING_SPEED, STEP_MS } from "./physics.ts";

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

  const jumped = () =>
    step(initialMovement(), { onGround: true, jump: true, jumpPressed: true }).state;

  it("cuts the speed when released while rising fast", () => {
    expect(step(jumped(), { vy: -393 }).vy).toBe(-200);
  });

  it("keeps a slow rise or a fall when released", () => {
    expect(step(jumped(), { vy: -150 }).vy).toBe(-150);
    expect(step(jumped(), { vy: 50 }).vy).toBe(50);
  });

  it("keeps the speed while the jump is held", () => {
    expect(step(jumped(), { jump: true, vy: -393 }).vy).toBe(-393);
  });

  it("does not cut a rise that did not come from a jump", () => {
    expect(step(initialMovement(), { vy: -393 }).vy).toBe(-393);
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

describe("knockback", () => {
  it("pushes away and up", () => {
    const push = knockback(-1);
    expect(push.vx).toBe(-160);
    expect(push.vy).toBe(-250);
  });

  it("locks the control for 15 steps, dropping jump presses", () => {
    let state = knockback(-1).state;
    for (let i = 0; i < 14; i += 1) {
      const result = step(state, { right: true, jump: true, jumpPressed: true, onGround: true });
      expect(result.vx).toBe(-160);
      expect(result.vy).toBe(0);
      state = result.state;
    }
    const free = step(state, { right: true });
    expect(free.vx).toBe(RUN_SPEED);
  });

  it("is not cut when the jump is released", () => {
    const state = knockback(1).state;
    const after = repeat(state, 15, {});
    expect(step(after, { vy: -240 }).vy).toBe(-240);
  });
});

describe("spring", () => {
  it("launches up without a cut, keeping vx", () => {
    const launch = springBounce(RUN_SPEED);
    expect(launch.vy).toBe(-SPRING_SPEED);
    expect(launch.vx).toBe(RUN_SPEED);
    expect(step(launch.state, { vy: -503 }).vy).toBe(-503);
  });

  it("gives no jump in the air after the launch", () => {
    const launch = springBounce(0);
    expect(step(launch.state, { jump: true, jumpPressed: true, vy: -500 }).vy).toBe(-500);
  });
});

describe("springLaunches", () => {
  it("launches when not rising and not hurt", () => {
    expect(springLaunches(0, false, false)).toBe(true);
    expect(springLaunches(120, false, false)).toBe(true);
    expect(springLaunches(-1, false, false)).toBe(false);
    expect(springLaunches(0, true, false)).toBe(false);
  });
});

describe("knockback in the middle of a jump", () => {
  it("is not cut when the held jump is released", () => {
    const jumped = step(initialMovement(), { onGround: true, jump: true, jumpPressed: true });
    const rising = step(jumped.state, { jump: true, vy: -380 }).state;
    const after = repeat(knockback(1).state, 15, { jump: true, vy: -240 });
    expect(rising.cuttable).toBe(true);
    expect(step(after, { vy: -240 }).vy).toBe(-240);
  });
});

describe("stompBounce (plan 1e)", () => {
  it("bounces up keeping vx, with no cut and no jump in the air", () => {
    const bounce = stompBounce(110);
    expect(bounce.vx).toBe(110);
    expect(bounce.vy).toBe(-300);
    const air = { ...idle, right: true, vy: -280 };
    expect(stepMovement(bounce.state, air, STEP_MS).vy).toBe(-280);
    const pressed = { ...air, jump: true, jumpPressed: true };
    expect(stepMovement(bounce.state, pressed, STEP_MS).vy).toBe(-280);
  });
  it("no spring launch in a step with a stomp", () => {
    expect(springLaunches(100, false, true)).toBe(false);
  });
});
