// Reachability validator of ADR 0013: a grid search over the places the player can stand,
// with jump limits kept below the real jump of `physics.ts`. A level whose flag is not
// reachable from the start fails the build.
import { isSolid, isSpike } from "./enemies.ts";
import { cellOf } from "./geometry.ts";
import { jumpReach, PLAYER_BODY } from "./physics.ts";
import { MAP_HEIGHT, TILE_SIZE } from "./tmj.ts";

export interface ValidatorReach {
  /** Rows a jump may climb. */
  rise: number;
  /** Empty columns a jump may cross. */
  gap: number;
  /** Free rows a jump needs above the feet row. */
  headroomRows: number;
}

/** Limits of ADR 0013, one below the real jump: 3, 3 and 5 with the physics of today. */
export function validatorReach(): ValidatorReach {
  const { heightTiles, gapTiles } = jumpReach();
  return {
    rise: Math.floor(heightTiles) - 1,
    gap: Math.floor(gapTiles) - 1,
    headroomRows: Math.ceil(heightTiles + PLAYER_BODY.height / TILE_SIZE) - 1,
  };
}

export interface ReachInput {
  width: number;
  terrain: readonly number[];
  start: { x: number; y: number };
  flag: { x: number; y: number };
}

export type ReachResult = { ok: true } | { ok: false; farthestCol: number };

/** Whether the flag can be reached from the start, walking, falling and jumping. */
export function checkReachable(input: ReachInput, reach = validatorReach()): ReachResult {
  const { width, terrain } = input;
  const gid = (c: number, r: number): number => terrain[r * width + c] ?? 0;
  // Left, right and top of the map are walls; below the map is a fall.
  const solid = (c: number, r: number): boolean => {
    if (c < 0 || c >= width || r < 0) return true;
    if (r >= MAP_HEIGHT) return false;
    return isSolid(gid(c, r));
  };
  const spike = (c: number, r: number): boolean =>
    c >= 0 && c < width && r >= 0 && r < MAP_HEIGHT && isSpike(gid(c, r));
  const free = (c: number, r: number): boolean => !solid(c, r) && !spike(c, r);
  const standing = (c: number, r: number): boolean =>
    r < MAP_HEIGHT && free(c, r) && free(c, r - 1) && solid(c, r + 1);

  /** Straight fall from (c, r) to the first standing place; null on a spike or the bottom. */
  const fall = (c: number, r: number): number | null => {
    for (let row = r; row < MAP_HEIGHT; row += 1) {
      if (!free(c, row)) return null;
      if (solid(c, row + 1)) return row;
    }
    return null;
  };

  const startCell = cellOf(input.start);
  const flagCell = cellOf(input.flag);
  const startRow = fall(startCell.col, startCell.row);
  if (startRow === null) return { ok: false, farthestCol: startCell.col };

  const seen = new Uint8Array(width * MAP_HEIGHT);
  const queue: number[] = [];
  let farthestCol = startCell.col;
  const visit = (c: number, r: number): void => {
    const key = r * width + c;
    if (seen[key] === 1) return;
    seen[key] = 1;
    queue.push(key);
    if (c > farthestCol) farthestCol = c;
  };
  visit(startCell.col, startRow);

  /**
   * Cells a jump from (c, r) to (target, landing) passes through are all free: the arc from
   * the headroom down to the take-off row in every column, and the landing column down to
   * the landing (ADR 0013). A ceiling between the two rows blocks the jump.
   */
  const clearJump = (c: number, r: number, target: number, landing: number): boolean => {
    const step = target >= c ? 1 : -1;
    const top = r - reach.headroomRows;
    const arcBottom = r - 1;
    for (let col = c; col !== target + step; col += step) {
      const bottom = col === target ? landing : arcBottom;
      for (let row = top; row <= bottom; row += 1) if (!free(col, row)) return false;
    }
    return true;
  };

  for (let head = 0; head < queue.length; head += 1) {
    const key = queue[head] as number; // head < queue.length
    const c = key % width;
    const r = (key - c) / width;
    if (c === flagCell.col && (r === flagCell.row || r === flagCell.row - 1)) return { ok: true };

    for (const dir of [-1, 1]) {
      const next = c + dir;
      if (standing(next, r)) visit(next, r);
      else if (free(next, r) && free(next, r - 1) && !solid(next, r + 1)) {
        const landing = fall(next, r);
        if (landing !== null) visit(next, landing);
      }
    }

    for (let target = c - reach.gap - 1; target <= c + reach.gap + 1; target += 1) {
      if (target === c || target < 0 || target >= width) continue;
      for (let landing = r - reach.rise; landing < MAP_HEIGHT; landing += 1) {
        if (landing < 0 || !standing(target, landing)) continue;
        if (clearJump(c, r, target, landing)) visit(target, landing);
      }
    }
  }
  return { ok: false, farthestCol };
}
