// One attempt at a level: hearts, invulnerability, coins, defeated enemies and how it ends
// (ADR 0006). Item 1f adds the events and the time.
import type { EnemyType } from "./enemies.ts";

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
  /** Ids of the enemy spawns already defeated in this attempt. */
  defeated: readonly number[];
  defeatedWalkers: number;
  defeatedFlyers: number;
}

export interface ItemContact {
  /** Id of the spawn in the level file. */
  id: number;
  type: "coin" | "heart";
}

export interface EnemyContact {
  /** Id of the spawn in the level file. */
  id: number;
  type: EnemyType;
  /** The player fell on it (`isStomp`). */
  stomp: boolean;
}

export interface AttemptContacts {
  items: readonly ItemContact[];
  /** Enemies touched this step. */
  enemies: readonly EnemyContact[];
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
  /** Enemies defeated in this step (the scene starts their defeat effect). */
  defeated: EnemyContact[];
  /** At least one enemy was stomped in this step (the player bounces unless hurt). */
  stomped: boolean;
  /** Lost a heart in this step (the scene pushes the player). */
  hurt: boolean;
  outcome: AttemptOutcome;
}

export function initialAttempt(): AttemptState {
  return {
    hearts: MAX_HEARTS,
    invulnerableMs: 0,
    coins: 0,
    collected: [],
    defeated: [],
    defeatedWalkers: 0,
    defeatedFlyers: 0,
  };
}

export function isInvulnerable(state: AttemptState): boolean {
  return state.invulnerableMs > EPSILON_MS;
}

/**
 * One physics step, in the order of ADR 0006: invulnerability runs down, items are
 * collected, stomped enemies are defeated (also while invulnerable), the flag ends the level
 * with no damage, then a spike or an enemy touched without a stomp hurts once.
 */
export function stepAttempt(
  state: AttemptState,
  contacts: AttemptContacts,
  dtMs: number,
): AttemptStep {
  let { hearts, coins, defeatedWalkers, defeatedFlyers } = state;
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
  const defeated: EnemyContact[] = [];
  let defeatedIds = state.defeated;
  let enemyHit = false;
  for (const enemy of contacts.enemies) {
    if (defeatedIds.includes(enemy.id)) continue;
    if (!enemy.stomp) {
      enemyHit = true;
      continue;
    }
    defeatedIds = [...defeatedIds, enemy.id];
    defeated.push(enemy);
    if (enemy.type === "walker") defeatedWalkers += 1;
    else defeatedFlyers += 1;
  }
  const next: AttemptState = {
    hearts,
    invulnerableMs,
    coins,
    collected: ids,
    defeated: defeatedIds,
    defeatedWalkers,
    defeatedFlyers,
  };
  const stomped = defeated.length > 0;
  const base = { collected, defeated, stomped };
  if (contacts.flag) return { ...base, state: next, hurt: false, outcome: "completed" };
  if ((!contacts.hazard && !enemyHit) || isInvulnerable(next)) {
    return { ...base, state: next, hurt: false, outcome: "playing" };
  }
  const hurt = { ...next, hearts: hearts - 1, invulnerableMs: INVULNERABLE_MS };
  return {
    ...base,
    state: hurt,
    hurt: true,
    outcome: hurt.hearts <= 0 ? "dead" : "playing",
  };
}

/** Opacity of the player: blinking while invulnerable, or still with "reduce effects". */
export function invulnerabilityAlpha(state: AttemptState, reduceEffects: boolean): number {
  if (!isInvulnerable(state)) return 1;
  if (reduceEffects) return STILL_ALPHA;
  const elapsed = INVULNERABLE_MS - state.invulnerableMs;
  return Math.floor(elapsed / BLINK_MS + EPSILON_MS) % 2 === 0 ? BLINK_ALPHA : 1;
}
