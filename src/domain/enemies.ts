// Enemies (plans 1e and 1g2): a walker and a spiky go back and forth on the ground, a flyer
// in the air, a vertical flyer up and down. They have no physics body: each one moves along a
// patrol range worked out once from the terrain, and contact with the player is decided
// here, by boxes (ADR 0004).
import { overlaps, type Rect } from "./geometry.ts";
import { gidOf, SPIKE_TILES } from "./tiles.ts";
import { MAP_HEIGHT, TILE_SIZE } from "./tmj.ts";

export type EnemyType = "walker" | "flyer" | "spiky" | "flyer-v";
/** What an enemy counts as in the score (ADR 0014). */
export type ScoredEnemy = "walker" | "flyer";

/** Px/s; the player runs at 110. */
export const WALKER_SPEED = 40;
export const FLYER_SPEED = 50;
export const SPIKY_SPEED = 40;
export const FLYER_V_SPEED = 50;
/** Cells a flyer goes to each side of its spawn (up and down for the vertical one). */
export const FLYER_RANGE_CELLS = 3;
/** Touch boxes, px: centred on `x`; a walker stands on the bottom of its cell. */
export const ENEMY_BOX = {
  walker: { width: 16, height: 14 },
  flyer: { width: 16, height: 12 },
  spiky: { width: 16, height: 14 },
  "flyer-v": { width: 16, height: 12 },
} as const satisfies Record<EnemyType, { width: number; height: number }>;

export const ENEMY_SPEED: Record<EnemyType, number> = {
  walker: WALKER_SPEED,
  flyer: FLYER_SPEED,
  spiky: SPIKY_SPEED,
  "flyer-v": FLYER_V_SPEED,
};

/** The axis an enemy patrols along: only the vertical flyer goes up and down. */
export function patrolAxis(type: EnemyType): "x" | "y" {
  return type === "flyer-v" ? "y" : "x";
}

/** A spiky cannot be stomped: it hurts from above too (ADR 0014). */
export function isStompable(type: EnemyType): boolean {
  return type !== "spiky";
}

/** What a defeated enemy scores as; `null` if it is not worth points (the spiky). */
export function scoredAs(type: EnemyType): ScoredEnemy | null {
  if (type === "walker") return "walker";
  if (type === "flyer" || type === "flyer-v") return "flyer";
  return null;
}

/** Range of the box centre on the patrol axis, px. */
export interface PatrolRange {
  min: number;
  max: number;
}

export interface PatrolState {
  /** Box centre on the patrol axis of the type, px. */
  pos: number;
  /** -1 goes left or up, 1 goes right or down. */
  direction: -1 | 1;
}

const SPIKE_GIDS: readonly number[] = SPIKE_TILES.map(gidOf);

export function isSpike(gid: number): boolean {
  return SPIKE_GIDS.includes(gid);
}

/** Solid terrain: any tile but a spike. */
export function isSolid(gid: number): boolean {
  return gid !== 0 && !isSpike(gid);
}

/** GID at a cell; outside the map counts as empty. */
function gidAt(terrain: readonly number[], width: number, col: number, row: number): number {
  if (col < 0 || col >= width || row < 0 || row >= MAP_HEIGHT) return 0;
  return terrain[row * width + col] ?? 0;
}

/**
 * Where an enemy spawned in `cell` may go (plan 1e, decision 1). A walker or a spiky extends
 * to each side while the next cell is free (neither solid nor a spike) and has solid ground
 * below; a flyer up to `FLYER_RANGE_CELLS` cells, stopping before a solid cell or a spike; a
 * vertical flyer the same, up and down, stopping also at the top of the map and at the last
 * row. The edge of the map is a wall.
 */
export function patrolRange(
  type: EnemyType,
  cell: { col: number; row: number },
  terrain: readonly number[],
  width: number,
): PatrolRange {
  const vertical = type === "flyer-v";
  const free = (index: number): boolean => {
    if (vertical) {
      if (index < 0 || index >= MAP_HEIGHT) return false;
      return gidAt(terrain, width, cell.col, index) === 0;
    }
    if (index < 0 || index >= width) return false;
    if (gidAt(terrain, width, index, cell.row) !== 0) return false;
    return type === "flyer" || isSolid(gidAt(terrain, width, index, cell.row + 1));
  };
  const origin = vertical ? cell.row : cell.col;
  const limit = type === "flyer" || vertical ? FLYER_RANGE_CELLS : Number.POSITIVE_INFINITY;
  let first = origin;
  while (origin - first < limit && free(first - 1)) first -= 1;
  let last = origin;
  while (last - origin < limit && free(last + 1)) last += 1;
  // A vertical flyer with no room to go up or down stays at the centre of its cell.
  if (vertical && first === last) {
    const centre = (first + 0.5) * TILE_SIZE;
    return { min: centre, max: centre };
  }
  const { width: boxWidth, height } = ENEMY_BOX[type];
  const half = (vertical ? height : boxWidth) / 2;
  return { min: first * TILE_SIZE + half, max: (last + 1) * TILE_SIZE - half };
}

/** Every type starts going left, or up, towards the player coming in (plan 1e, decision 1). */
export function initialPatrol(range: PatrolRange, pos: number): PatrolState {
  return { pos: Math.min(range.max, Math.max(range.min, pos)), direction: -1 };
}

/** Moves along the range; passing an end reflects the excess and turns around. */
export function stepPatrol(
  state: PatrolState,
  range: PatrolRange,
  speed: number,
  dtMs: number,
): PatrolState {
  if (range.max <= range.min) return { pos: range.min, direction: state.direction };
  let x = state.pos + (state.direction * speed * dtMs) / 1000;
  let direction = state.direction;
  if (x < range.min) {
    x = Math.min(range.max, 2 * range.min - x);
    direction = 1;
  } else if (x > range.max) {
    x = Math.max(range.min, 2 * range.max - x);
    direction = -1;
  }
  return { pos: x, direction };
}

/**
 * Touch box at centre `x` (plan 1e, decision 2). `y` is the spawn point for the types that
 * stay in their row (a walker and a spiky stand on the bottom of the cell, a flyer is
 * centred in it) and the centre of the box for the vertical flyer.
 */
export function enemyBox(type: EnemyType, x: number, y: number): Rect {
  const { width, height } = ENEMY_BOX[type];
  const row = Math.floor(y / TILE_SIZE);
  let bottom: number;
  if (type === "walker" || type === "spiky") bottom = (row + 1) * TILE_SIZE;
  else if (type === "flyer") bottom = (row + 0.5) * TILE_SIZE + height / 2;
  else bottom = y + height / 2;
  return { left: x - width / 2, top: bottom - height, right: x + width / 2, bottom };
}

/**
 * A stomp (plan 1e, decision 3): the boxes overlap, the body was falling in this step and
 * its feet are at most at the middle line of the enemy (a tie counts).
 */
export function isStomp(player: Rect, vy: number, enemy: Rect): boolean {
  if (vy <= 0) return false;
  if (!overlaps(player, enemy)) return false;
  return player.bottom <= (enemy.top + enemy.bottom) / 2;
}

/** Defeat effect (plan 1e, decision 9): upside down, a hop, then a fall off the screen. */
export const DEFEAT_HOP_SPEED = 150;
export const DEFEAT_GRAVITY = 1000;
export const DEFEAT_MS = 1000;
/** With "reduce effects": still, upside down, fading out in this long. */
export const DEFEAT_FADE_MS = 300;

export interface DefeatPose {
  /** Offset from where it was defeated, whole px (negative is up). */
  dy: number;
  alpha: number;
}

export function defeatPose(elapsedMs: number, reduceEffects: boolean): DefeatPose {
  if (reduceEffects) return { dy: 0, alpha: Math.max(0, 1 - elapsedMs / DEFEAT_FADE_MS) };
  const t = elapsedMs / 1000;
  const dy = -DEFEAT_HOP_SPEED * t + (DEFEAT_GRAVITY * t * t) / 2;
  // `+ 0` turns −0 into 0.
  return { dy: Math.round(dy) + 0, alpha: 1 };
}

export function defeatFinished(elapsedMs: number, reduceEffects: boolean): boolean {
  return elapsedMs >= (reduceEffects ? DEFEAT_FADE_MS : DEFEAT_MS);
}
