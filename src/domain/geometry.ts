// Map geometry the scene asks about: where spawns sit and when the player touches the flag.
import { TILE_SIZE } from "./tmj.ts";

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Cell {
  col: number;
  row: number;
}

export function cellOf(point: { x: number; y: number }): Cell {
  return { col: Math.floor(point.x / TILE_SIZE), row: Math.floor(point.y / TILE_SIZE) };
}

/** Where a body standing in `cell` has its feet: centre of the column, bottom of the row. */
export function feetIn(cell: Cell): { x: number; y: number } {
  return { x: (cell.col + 0.5) * TILE_SIZE, y: (cell.row + 1) * TILE_SIZE };
}

/** The flag's touch area: its column, from the spawn row up to one row above. */
export function flagZone(flag: { x: number; y: number }): Rect {
  const { col, row } = cellOf(flag);
  return {
    left: col * TILE_SIZE,
    top: (row - 1) * TILE_SIZE,
    right: (col + 1) * TILE_SIZE,
    bottom: (row + 1) * TILE_SIZE,
  };
}

/** Rectangles that share some area (touching edges do not count). */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** Hurting part of a spike: the bottom half of its cell, 2 px in from each side (14×9). */
export function spikeBox(cell: Cell): Rect {
  const left = cell.col * TILE_SIZE;
  const top = cell.row * TILE_SIZE;
  return { left: left + 2, top: top + 9, right: left + TILE_SIZE - 2, bottom: top + TILE_SIZE };
}

/** Touch area of a coin or a heart: the cell, 3 px in from each side (12×12). */
export function itemBox(cell: Cell): Rect {
  const left = cell.col * TILE_SIZE;
  const top = cell.row * TILE_SIZE;
  return {
    left: left + 3,
    top: top + 3,
    right: left + TILE_SIZE - 3,
    bottom: top + TILE_SIZE - 3,
  };
}

/** Touch area of a spring: the bottom half of its cell, 1 px in from each side (16×9). */
export function springBox(cell: Cell): Rect {
  const left = cell.col * TILE_SIZE;
  const top = cell.row * TILE_SIZE;
  return { left: left + 1, top: top + 9, right: left + TILE_SIZE - 1, bottom: top + TILE_SIZE };
}

/**
 * Side a push goes: away from the hazard; right on top of it, against where the player
 * looks (plan 1d, decision 3).
 */
export function knockbackDirection(
  playerCenterX: number,
  sourceCenterX: number,
  facing: -1 | 1,
): -1 | 1 {
  if (playerCenterX < sourceCenterX) return -1;
  if (playerCenterX > sourceCenterX) return 1;
  return facing === 1 ? -1 : 1;
}

/** Cells of a terrain layer (`data`, row by row) holding one of `gids`. */
export function cellsWith(data: readonly number[], width: number, gids: readonly number[]): Cell[] {
  const cells: Cell[] = [];
  data.forEach((gid, index) => {
    if (gids.includes(gid)) cells.push({ col: index % width, row: Math.floor(index / width) });
  });
  return cells;
}

/** Columns with no tile at all in a terrain layer: a pit open to the bottom of the map. */
export function pitColumns(data: readonly number[], width: number): number[] {
  const pits: number[] = [];
  const height = data.length / width;
  for (let col = 0; col < width; col += 1) {
    let empty = true;
    for (let row = 0; row < height && empty; row += 1) empty = data[row * width + col] === 0;
    if (empty) pits.push(col);
  }
  return pits;
}

/**
 * Still things (spikes, items, springs) bucketed by the columns their box covers, so a step
 * looks only at the columns the player touches. `query` fills `out` and allocates nothing.
 */
export class ColumnIndex<T> {
  private readonly columns: T[][];

  constructor(items: readonly T[], boxOf: (item: T) => Rect, widthInTiles: number) {
    this.columns = Array.from({ length: widthInTiles }, () => []);
    for (const item of items) {
      const box = boxOf(item);
      const first = Math.max(0, Math.floor(box.left / TILE_SIZE));
      const last = Math.min(widthInTiles - 1, Math.floor((box.right - 1) / TILE_SIZE));
      for (let col = first; col <= last; col += 1) this.columns[col]?.push(item);
    }
  }

  /** Items whose columns meet [left, right) px, each once, in `out` (emptied first). */
  query(left: number, right: number, out: T[]): T[] {
    out.length = 0;
    const first = Math.max(0, Math.floor(left / TILE_SIZE));
    const last = Math.min(this.columns.length - 1, Math.floor((right - 1) / TILE_SIZE));
    for (let col = first; col <= last; col += 1) {
      const bucket = this.columns[col];
      if (bucket === undefined) continue;
      for (let i = 0; i < bucket.length; i += 1) {
        const item = bucket[i] as T; // i < bucket.length
        if (!out.includes(item)) out.push(item);
      }
    }
    return out;
  }
}
