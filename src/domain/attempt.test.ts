import { describe, expect, it } from "vitest";
import {
  type AttemptContacts,
  type AttemptState,
  INVULNERABLE_MS,
  initialAttempt,
  invulnerabilityAlpha,
  isInvulnerable,
  stepAttempt,
} from "./attempt.ts";
import { STEP_MS } from "./physics.ts";

const none: AttemptContacts = { items: [], hazard: false, flag: false };
const spike: AttemptContacts = { ...none, hazard: true };

function step(state: AttemptState, contacts: Partial<AttemptContacts> = {}) {
  return stepAttempt(state, { ...none, ...contacts }, STEP_MS);
}

function wait(state: AttemptState, steps: number): AttemptState {
  let current = state;
  for (let i = 0; i < steps; i += 1) current = step(current).state;
  return current;
}

describe("start", () => {
  it("has 3 hearts, no coins and no invulnerability", () => {
    const state = initialAttempt();
    expect(state.hearts).toBe(3);
    expect(state.coins).toBe(0);
    expect(isInvulnerable(state)).toBe(false);
  });
});

describe("damage (ADR 0006)", () => {
  it("a hazard takes one heart and gives 1.5 s of invulnerability", () => {
    const result = step(initialAttempt(), spike);
    expect(result.state.hearts).toBe(2);
    expect(result.state.invulnerableMs).toBe(INVULNERABLE_MS);
    expect(result.hurt).toBe(true);
    expect(result.outcome).toBe("playing");
  });

  it("protects for 89 steps and no longer on step 90", () => {
    const hurt = step(initialAttempt(), spike).state;
    expect(step(wait(hurt, 88), spike).state.hearts).toBe(2);
    expect(step(wait(hurt, 89), spike).state.hearts).toBe(1);
  });

  it("two hits 1 s apart take only one heart", () => {
    const hurt = step(initialAttempt(), spike).state;
    const second = step(wait(hurt, 59), spike);
    expect(second.state.hearts).toBe(2);
    expect(second.hurt).toBe(false);
  });

  it("three hits 90 steps apart end the attempt", () => {
    let state = initialAttempt();
    const outcomes: string[] = [];
    for (let hit = 0; hit < 3; hit += 1) {
      const result = step(state, spike);
      outcomes.push(result.outcome);
      state = wait(result.state, 89);
    }
    expect(outcomes).toEqual(["playing", "playing", "dead"]);
    expect(state.hearts).toBe(0);
  });
});

describe("items", () => {
  const heart = (id: number) => ({ id, type: "heart" as const });
  const coin = (id: number) => ({ id, type: "coin" as const });

  it("a heart adds one up to 3, and is consumed at 3", () => {
    const two = step(initialAttempt(), spike).state;
    expect(step(two, { items: [heart(6)] }).state.hearts).toBe(3);
    const full = step(initialAttempt(), { items: [heart(6)] });
    expect(full.state.hearts).toBe(3);
    expect(full.state.collected).toEqual([6]);
    expect(full.collected).toEqual([heart(6)]);
  });

  it("two hearts in one step with 1 heart → 3", () => {
    const one = { ...initialAttempt(), hearts: 1 };
    expect(step(one, { items: [heart(1), heart(2)] }).state.hearts).toBe(3);
  });

  it("a coin touched on two steps counts once", () => {
    const first = step(initialAttempt(), { items: [coin(5)] });
    const second = step(first.state, { items: [coin(5)] });
    expect(second.state.coins).toBe(1);
    expect(second.collected).toEqual([]);
  });
});

describe("order within a step (plan 1d, decision 10)", () => {
  it("a heart and a hazard with 1 heart → survives with 1", () => {
    const one = { ...initialAttempt(), hearts: 1 };
    const result = step(one, { items: [{ id: 6, type: "heart" }], hazard: true });
    expect(result.state.hearts).toBe(1);
    expect(result.outcome).toBe("playing");
  });

  it("the flag and a hazard → completed, no damage", () => {
    const result = step(initialAttempt(), { flag: true, hazard: true });
    expect(result.outcome).toBe("completed");
    expect(result.state.hearts).toBe(3);
    expect(result.hurt).toBe(false);
  });
});

describe("invulnerability opacity", () => {
  const at = (elapsedMs: number): AttemptState => ({
    ...initialAttempt(),
    invulnerableMs: INVULNERABLE_MS - elapsedMs,
  });

  it("is 1 when not invulnerable", () => {
    expect(invulnerabilityAlpha(initialAttempt(), false)).toBe(1);
    expect(invulnerabilityAlpha(initialAttempt(), true)).toBe(1);
  });

  it.each([
    [0, 0.4],
    [249, 0.4],
    [250, 1],
    [500, 0.4],
  ])("%d ms after the hit → %d", (elapsed, alpha) => {
    expect(invulnerabilityAlpha(at(elapsed), false)).toBe(alpha);
  });

  it("is a still 0.5 with reduce effects", () => {
    for (const elapsed of [0, 250, 700, 1400]) {
      expect(invulnerabilityAlpha(at(elapsed), true)).toBe(0.5);
    }
  });

  it("changes at most 4 times in a second (2 blinks)", () => {
    let state = step(initialAttempt(), spike).state;
    let last = invulnerabilityAlpha(state, false);
    let changes = 0;
    for (let i = 0; i < 60; i += 1) {
      state = step(state).state;
      const alpha = invulnerabilityAlpha(state, false);
      if (alpha !== last) changes += 1;
      last = alpha;
    }
    expect(changes).toBeLessThanOrEqual(4);
  });
});
