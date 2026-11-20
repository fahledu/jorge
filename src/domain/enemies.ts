// Enemies (plan 1e): a walker goes back and forth on the ground, a flyer in the air. They
// have no physics body: each one moves along a patrol range worked out once from the
// terrain, and contact with the player is decided here, by boxes (ADR 0004).
import { overlaps, type Rect } from "./geometry.ts";
import { gidOf, SPIKE_TILES } from "./tiles.ts";
import { MAP_HEIGHT, TILE_SIZE } from "./tmj.ts";

export type EnemyType = "walker" | "flyer";

/** Px/s; the player runs at 110. */
export const WALKER_SPEED = 40;
export const FLYER_SPEED = 50;
/** Cells a flyer goes to each side of its spawn. */
export const FLYER_RANGE_CELLS = 3;
/** Touch boxes, px: centred on `x`; a walker stands on the bottom of its cell. */
export const ENEMY_BOX = {
  walker: { width: 16, height: 14 },
  flyer: { width: 16, height: 12 },
} as const satisfies Record<EnemyType, { width: number; height: number }>;

export const ENEMY_SPEED: Record<EnemyType, number> = {
  walker: WALKER_SPEED,
  flyer: FLYER_SPEED,
};

/** Range of the box centre, px. */
export interface PatrolRange {
  min: number;
  max: number;
}

export interface PatrolState {
  x: number;
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
 * Where an enemy spawned in `cell` may go (plan 1e, decision 1). A walker extends to each
 * side while the next cell is free (neither solid nor a spike) and has solid ground below;
 * a flyer up to `FLYER_RANGE_CELLS` cells, stopping before a solid cell or a spike. The edge
 * of the map is a wall.
 */
export function patrolRange(
  type: EnemyType,
  cell: { col: number; row: number },
  terrain: readonly number[],
  width: number,
): PatrolRange {
  const free = (col: number): boolean => {
    if (col < 0 || col >= width) return false;
    if (gidAt(terrain, width, col, cell.row) !== 0) return false;
    return type === "flyer" || isSolid(gidAt(terrain, width, col, cell.row + 1));
  };
  const limit = type === "flyer" ? FLYER_RANGE_CELLS : Number.POSITIVE_INFINITY;
  let first = cell.col;
  while (cell.col - first < limit && free(first - 1)) first -= 1;
  let last = cell.col;
  while (last - cell.col < limit && free(last + 1)) last += 1;
  const half = ENEMY_BOX[type].width / 2;
  return { min: first * TILE_SIZE + half, max: (last + 1) * TILE_SIZE - half };
}

/** Both kinds start going left, towards the player coming in (plan 1e, decision 1). */
export function initialPatrol(range: PatrolRange, x: number): PatrolState {
  return { x: Math.min(range.max, Math.max(range.min, x)), direction: -1 };
}

/** Moves along the range; passing an end reflects the excess and turns around. */
export function stepPatrol(
  state: PatrolState,
  range: PatrolRange,
  speed: number,
  dtMs: number,
): PatrolState {
  if (range.max <= range.min) return { x: range.min, direction: state.direction };
  let x = state.x + (state.direction * speed * dtMs) / 1000;
  let direction = state.direction;
  if (x < range.min) {
    x = Math.min(range.max, 2 * range.min - x);
    direction = 1;
  } else if (x > range.max) {
    x = Math.max(range.min, 2 * range.max - x);
    direction = -1;
  }
  return { x, direction };
}

/** Touch box at centre `x` in `row` (plan 1e, decision 2). */
export function enemyBox(type: EnemyType, x: number, row: number): Rect {
  const { width, height } = ENEMY_BOX[type];
  const bottom = type === "walker" ? (row + 1) * TILE_SIZE : (row + 0.5) * TILE_SIZE + height / 2;
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
