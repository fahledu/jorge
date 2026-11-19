// One attempt at a level: hearts, invulnerability, coins and how it ends (ADR 0006).
// Item 1f adds the events and the time.

export const MAX_HEARTS = 3;
/** Invulnerability after a hit, ms (ADR 0006). */
export const INVULNERABLE_MS = 1500;
/** Blink of the invulnerable player: opacity changes every this many ms (2 blinks/s). */
export const BLINK_MS = 250;
const BLINK_ALPHA = 0.4;
/** Fixed opacity while invulnerable with "reduce effects" on. */
const STILL_ALPHA = 0.5;
/** Tolerance for timers counted down in steps of 1000/60 ms. */
const EPSILON_MS = 1e-6;

export interface AttemptState {
  hearts: number;
  /** Invulnerability left, ms. */
  invulnerableMs: number;
  coins: number;
  /** Ids of the spawns already collected in this attempt. */
  collected: readonly number[];
}

export interface ItemContact {
  /** Id of the spawn in the level file. */
  id: number;
  type: "coin" | "heart";
}

export interface AttemptContacts {
  items: readonly ItemContact[];
  /** Touching a hazard (spike) this step. */
  hazard: boolean;
  /** Touching the flag this step. */
  flag: boolean;
}

export type AttemptOutcome = "playing" | "completed" | "dead";

export interface AttemptStep {
  state: AttemptState;
  /** Items collected in this step (the scene hides them). */
  collected: ItemContact[];
  /** Lost a heart in this step (the scene pushes the player). */
  hurt: boolean;
  outcome: AttemptOutcome;
}

export function initialAttempt(): AttemptState {
  return { hearts: MAX_HEARTS, invulnerableMs: 0, coins: 0, collected: [] };
}

export function isInvulnerable(state: AttemptState): boolean {
  return state.invulnerableMs > EPSILON_MS;
}

/**
 * One physics step. Order (plan 1d, decision 10): invulnerability runs down, items are
 * collected, the flag ends the level with no damage, then the hazard hurts.
 */
export function stepAttempt(
  state: AttemptState,
  contacts: AttemptContacts,
  dtMs: number,
): AttemptStep {
  let { hearts, coins } = state;
  const invulnerableMs = Math.max(0, state.invulnerableMs - dtMs);
  const collected: ItemContact[] = [];
  let ids = state.collected;
  for (const item of contacts.items) {
    if (ids.includes(item.id)) continue;
    ids = [...ids, item.id];
    collected.push(item);
    if (item.type === "coin") coins += 1;
    else hearts = Math.min(MAX_HEARTS, hearts + 1);
  }
  const next = { hearts, invulnerableMs, coins, collected: ids };
  if (contacts.flag) return { state: next, collected, hurt: false, outcome: "completed" };
  if (!contacts.hazard || isInvulnerable(next)) {
    return { state: next, collected, hurt: false, outcome: "playing" };
  }
  const hurt = { ...next, hearts: hearts - 1, invulnerableMs: INVULNERABLE_MS };
  return { state: hurt, collected, hurt: true, outcome: hurt.hearts <= 0 ? "dead" : "playing" };
}

/** Opacity of the player: blinking while invulnerable, or still with "reduce effects". */
export function invulnerabilityAlpha(state: AttemptState, reduceEffects: boolean): number {
  if (!isInvulnerable(state)) return 1;
  if (reduceEffects) return STILL_ALPHA;
  const elapsed = INVULNERABLE_MS - state.invulnerableMs;
  return Math.floor(elapsed / BLINK_MS + EPSILON_MS) % 2 === 0 ? BLINK_ALPHA : 1;
}
