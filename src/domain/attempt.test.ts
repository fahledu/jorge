import { describe, expect, it } from "vitest";
import {
  type AttemptContacts,
  type AttemptEvent,
  type AttemptState,
  INVULNERABLE_MS,
  initialAttempt,
  invulnerabilityAlpha,
  isInvulnerable,
  stepAttempt,
} from "./attempt.ts";
import { STEP_MS } from "./physics.ts";

const none: AttemptContacts = { items: [], enemies: [], hazard: false, flag: false };
const spike: AttemptContacts = { ...none, hazard: true };

/** The counters of 1e always match the events (plan 1f): checked on every step. */
function expectCountersMatchEvents(state: AttemptState): void {
  const count = (match: (e: AttemptEvent) => boolean) => state.events.filter(match).length;
  expect(state.coins).toBe(count((e) => e.type === "coin"));
  expect(state.defeatedWalkers).toBe(
    count((e) => e.type === "enemyDefeated" && e.enemy === "walker"),
  );
  expect(state.defeatedFlyers).toBe(
    count((e) => e.type === "enemyDefeated" && e.enemy === "flyer"),
  );
}

function step(state: AttemptState, contacts: Partial<AttemptContacts> = {}) {
  const result = stepAttempt(state, { ...none, ...contacts }, STEP_MS);
  expectCountersMatchEvents(result.state);
  return result;
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
    expect(result.state.events).toEqual([{ type: "completed" }]);
  });

  it("the flag and an enemy touch with 1 heart → completed, not dead", () => {
    const one = { ...initialAttempt(), hearts: 1 };
    const result = step(one, { flag: true, enemies: [{ id: 4, type: "flyer", stomp: false }] });
    expect(result.outcome).toBe("completed");
    expect(result.state.hearts).toBe(1);
    expect(result.state.events).toEqual([{ type: "completed" }]);
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

describe("enemies (ADR 0006, plan 1e)", () => {
  const walker = (id: number, stomp: boolean) => ({ id, type: "walker" as const, stomp });
  const flyer = (id: number, stomp: boolean) => ({ id, type: "flyer" as const, stomp });

  it("a stomp defeats the enemy once, with no damage", () => {
    const first = step(initialAttempt(), { enemies: [walker(7, true)] });
    expect(first.state.defeated).toEqual([7]);
    expect(first.state.defeatedWalkers).toBe(1);
    expect(first.state.hearts).toBe(3);
    expect(first.stomped).toBe(true);
    expect(first.defeated).toEqual([walker(7, true)]);
    const again = step(first.state, { enemies: [walker(7, true)] });
    expect(again.state.defeatedWalkers).toBe(1);
    expect(again.defeated).toEqual([]);
    expect(again.stomped).toBe(false);
  });

  it("a defeated enemy no longer hurts in the attempt", () => {
    const first = step(initialAttempt(), { enemies: [walker(7, true)] });
    const touch = step(first.state, { enemies: [walker(7, false)] });
    expect(touch.hurt).toBe(false);
    expect(touch.state.hearts).toBe(3);
  });

  it("a touch without a stomp hurts; not again while invulnerable", () => {
    const hit = step(initialAttempt(), { enemies: [walker(1, false)] });
    expect(hit.hurt).toBe(true);
    expect(hit.state.hearts).toBe(2);
    expect(isInvulnerable(hit.state)).toBe(true);
    const again = step(hit.state, { enemies: [walker(1, false)] });
    expect(again.hurt).toBe(false);
    expect(again.state.hearts).toBe(2);
  });

  it("a stomp still defeats while invulnerable", () => {
    const hit = step(initialAttempt(), spike);
    const stomp = step(hit.state, { enemies: [flyer(3, true)] });
    expect(stomp.state.defeatedFlyers).toBe(1);
    expect(stomp.state.hearts).toBe(2);
    expect(stomp.stomped).toBe(true);
  });

  it("a spike and a walker in the same step take one heart", () => {
    const result = step(initialAttempt(), { hazard: true, enemies: [walker(1, false)] });
    expect(result.state.hearts).toBe(2);
  });

  it("a spike, then a walker 1000 ms later: only the first takes a heart", () => {
    const hit = step(initialAttempt(), spike);
    const later = step(wait(hit.state, 59), { enemies: [walker(1, false)] });
    expect(later.hurt).toBe(false);
    expect(later.state.hearts).toBe(2);
  });

  it("stomping one and touching another from the side: defeats one and hurts", () => {
    const result = step(initialAttempt(), { enemies: [walker(1, true), walker(2, false)] });
    expect(result.state.defeated).toEqual([1]);
    expect(result.stomped).toBe(true);
    expect(result.hurt).toBe(true);
    expect(result.state.hearts).toBe(2);
  });

  it("two stomps in one step defeat both", () => {
    const result = step(initialAttempt(), { enemies: [walker(1, true), flyer(2, true)] });
    expect(result.state.defeatedWalkers).toBe(1);
    expect(result.state.defeatedFlyers).toBe(1);
  });

  it("the flag and a stomp: completed and counted; the flag and a touch: no damage", () => {
    const stomp = step(initialAttempt(), { flag: true, enemies: [walker(1, true)] });
    expect(stomp.outcome).toBe("completed");
    expect(stomp.state.defeatedWalkers).toBe(1);
    const touch = step(initialAttempt(), { flag: true, enemies: [walker(1, false)] });
    expect(touch.outcome).toBe("completed");
    expect(touch.state.hearts).toBe(3);
  });

  it("one heart and a touch: dead", () => {
    const state = { ...initialAttempt(), hearts: 1 };
    expect(step(state, { enemies: [flyer(1, false)] }).outcome).toBe("dead");
  });

  it("a new attempt has no defeated enemies", () => {
    const state = initialAttempt();
    expect(state.defeated).toEqual([]);
    expect(state.defeatedWalkers).toBe(0);
    expect(state.defeatedFlyers).toBe(0);
  });
});

describe("events and time (plan 1f)", () => {
  const walker = (id: number, stomp: boolean) => ({ id, type: "walker" as const, stomp });
  const coin = (id: number) => ({ id, type: "coin" as const });
  const heart = (id: number) => ({ id, type: "heart" as const });

  it("a new attempt has no events and no time", () => {
    expect(initialAttempt().events).toEqual([]);
    expect(initialAttempt().elapsedMs).toBe(0);
  });

  it("a coin, a heart at 3 and a stomp: coin then walker, nothing for the heart", () => {
    const result = step(initialAttempt(), {
      items: [coin(1), heart(2)],
      enemies: [walker(3, true)],
    });
    expect(result.state.events).toEqual([
      { type: "coin" },
      { type: "enemyDefeated", enemy: "walker" },
    ]);
  });

  it("a stomp and the flag in one step: the enemy, then completed", () => {
    const result = step(initialAttempt(), { enemies: [walker(3, true)], flag: true });
    expect(result.state.events).toEqual([
      { type: "enemyDefeated", enemy: "walker" },
      { type: "completed" },
    ]);
  });

  it("a coin touched again adds no event", () => {
    const first = step(initialAttempt(), { items: [coin(1)] });
    expect(step(first.state, { items: [coin(1)] }).state.events).toHaveLength(1);
  });

  it("60 steps add up to 1000 ms", () => {
    expect(wait(initialAttempt(), 60).elapsedMs).toBeCloseTo(1000, 6);
  });

  it("the time also counts on a hurt step", () => {
    expect(step(initialAttempt(), spike).state.elapsedMs).toBe(STEP_MS);
  });
});
