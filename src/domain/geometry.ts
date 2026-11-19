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
