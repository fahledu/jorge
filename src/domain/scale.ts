/** Internal resolution of the game, in game pixels (ADR 0009). */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

/** Smallest factor at which the scale snaps to whole numbers (ADR 0009). */
const MIN_INTEGER_SCALE = 2;

export interface ScaleResult {
  /** CSS pixels per game pixel. */
  scale: number;
  /** Size of the game on screen, in CSS pixels. */
  width: number;
  height: number;
  /** Position of the game inside the view, centered, in CSS pixels. */
  offsetX: number;
  offsetY: number;
}

/**
 * Fits the 480×270 game in a view: whole-number scale when the view takes 2× or more,
 * otherwise a fractional fit (nearest-neighbour is the renderer's job).
 */
export function computeScale(viewWidth: number, viewHeight: number): ScaleResult {
  const usable =
    Number.isFinite(viewWidth) && Number.isFinite(viewHeight) && viewWidth > 0 && viewHeight > 0;
  if (!usable) {
    // Minimized window or no layout yet: keep the native size instead of breaking.
    return { scale: 1, width: GAME_WIDTH, height: GAME_HEIGHT, offsetX: 0, offsetY: 0 };
  }
  const fit = Math.min(viewWidth / GAME_WIDTH, viewHeight / GAME_HEIGHT);
  const scale = fit >= MIN_INTEGER_SCALE ? Math.floor(fit) : fit;
  // Round, not truncate: 270 × (390 / 270) is 389.999… in floating point.
  const width = Math.min(viewWidth, Math.round(GAME_WIDTH * scale));
  const height = Math.min(viewHeight, Math.round(GAME_HEIGHT * scale));
  return {
    scale,
    width,
    height,
    offsetX: Math.floor((viewWidth - width) / 2),
    offsetY: Math.floor((viewHeight - height) / 2),
  };
}
