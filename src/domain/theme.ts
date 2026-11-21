// Visual themes by block of 10 levels (ADR 0015): which tiles a level is drawn with. The
// level files keep the real theme id; the look of the expansion blocks is borrowed from a
// theme of the base pack until their own tiles arrive (plan 1g2, decision 8).
import { THEME_TILES } from "./tiles.ts";

/** In the order of the tiers: the theme of tier `n` is `THEMES[n - 1]`. */
export const THEMES = [
  "meadow",
  "forest",
  "farm",
  "desert",
  "cave",
  "factory",
  "temple",
  "snow",
  "candy",
  "castle",
] as const;
export type Theme = (typeof THEMES)[number];

/** Theme whose tiles and background an unfinished theme uses for now. */
export const PROVISIONAL_THEME: Partial<Record<Theme, Theme>> = {
  farm: "meadow",
  factory: "cave",
  temple: "desert",
  candy: "snow",
  castle: "cave",
};

export function themeOf(tier: number): Theme {
  const theme = THEMES[tier - 1];
  if (!Number.isInteger(tier) || theme === undefined) {
    throw new Error(`tier must be 1 to ${THEMES.length}, got ${tier}`);
  }
  return theme;
}

/** The theme whose tiles and background are drawn: itself, or the provisional one. */
export function lookOf(theme: Theme): Theme {
  return PROVISIONAL_THEME[theme] ?? theme;
}

/**
 * Swaps the tiles of the base palette for the theme's, tile by tile (ADR 0015). Decoration
 * with no equivalent leaves the map; terrain never does. A theme with no table (and no
 * provisional one) is an error, never a silent default.
 */
export function applyTheme(
  terrain: readonly number[],
  decor: readonly number[],
  theme: Theme,
  table: Partial<Record<Theme, ReadonlyMap<number, number>>> = THEME_TILES,
): { terrain: number[]; decor: number[] } {
  const look = lookOf(theme);
  const tiles = table[look];
  if (tiles === undefined) throw new Error(`theme "${theme}" has no tile table (look "${look}")`);
  const swap = (gid: number): number => (gid === 0 ? 0 : (tiles.get(gid) ?? gid));
  return {
    terrain: terrain.map((gid) => {
      const swapped = swap(gid);
      if (swapped === 0 && gid !== 0) throw new Error(`terrain tile ${gid} has no ${look} tile`);
      return swapped;
    }),
    decor: decor.map(swap),
  };
}
