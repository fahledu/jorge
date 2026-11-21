// Ids with a role in the game (ADR 0008), local ids of each sheet (GID = id + 1 in levels).
import type { EnemyType } from "./enemies.ts";
import type { Theme } from "./theme.ts";

/** Frames of the player in `tilemap-characters_packed.png` (24×24). */
export const PLAYER_FRAMES = { idle: 0, walk: 1 } as const;
/** Direction the character looks in the sheet; the sprite is mirrored for the other. */
export const PLAYER_FACES_RIGHT = false;

/**
 * Frames of the enemies in `tilemap-characters_packed.png` by theme and type (plan 1g2,
 * decision 2). The pack has no colour variants, so all themes use the same drawings; the
 * table stays per theme so a variant only changes here.
 */
const ENEMY_DRAWINGS = {
  walker: [18, 19],
  flyer: [24, 25],
  spiky: [15, 16],
  "flyer-v": [11, 12],
} as const satisfies Record<EnemyType, readonly number[]>;
export const ENEMY_FRAMES = {
  meadow: ENEMY_DRAWINGS,
  forest: ENEMY_DRAWINGS,
  farm: ENEMY_DRAWINGS,
  desert: ENEMY_DRAWINGS,
  cave: ENEMY_DRAWINGS,
  factory: ENEMY_DRAWINGS,
  temple: ENEMY_DRAWINGS,
  snow: ENEMY_DRAWINGS,
  candy: ENEMY_DRAWINGS,
  castle: ENEMY_DRAWINGS,
} as const satisfies Record<Theme, Record<EnemyType, readonly number[]>>;
/** The enemies' drawings are symmetric; mirrored like the player when going right. */
export const ENEMY_FACES_RIGHT = false;

/** The flag in `tilemap_packed.png` (18×18): cloth (2 frames) on top of the pole. */
export const FLAG_TILES = { cloth: [111, 112], pole: 131 } as const;

/** Spikes in the terrain layer of `tilemap_packed.png`: they hurt and are not solid. */
export const SPIKE_TILES = [68] as const;
export const COIN_TILE = 151;
/** The secret item of the challenge mode: the gem (GID 68), drawn where its spawn is. */
export const SECRET_TILE = 67;
/** Hearts of the HUD. */
export const HEART_TILES = { full: 44, empty: 46 } as const;
/**
 * First of the HUD digits 0–9 in the last row of the sheet (ADR 0009): the smaller of the
 * two series, glyph 10×12 px with its outline at x 4–13 of the tile (plan 1f, decision 4).
 */
export const DIGIT_TILES = 160;
/** The spring: extended at rest, compressed for a moment when it launches. */
export const SPRING_TILES = { extended: 108, compressed: 107 } as const;
/** White wings behind the player when it dies (plan 1d, decision 14). */
export const WINGS_TILE = 144;

/** GID of a local id in the level files and in Phaser's tile index. */
export function gidOf(localId: number): number {
  return localId + 1;
}

/**
 * Tiles with edge variants, as GIDs: alone, left edge, middle, right edge (palette in
 * `levels/README.md`). The generator redraws them at the chunk joins (ADR 0013).
 */
export const EDGE_FAMILIES: readonly (readonly [number, number, number, number])[] = [
  [21, 22, 23, 24], // grass on top of the ground
  [121, 122, 123, 124], // dirt below the grass
  [1, 2, 3, 4], // one-row platform
];

/**
 * Theme tables (ADR 0015, plan 1g2, decision 1): GID of the base palette (`levels/README.md`,
 * the meadow) → GID of the theme; 0 = the decoration does not exist in that theme. Spike,
 * spring, coin, heart, flag and gem are not in the tables: they look the same everywhere.
 */
const themeTable = (rows: readonly (readonly [number, number])[]): ReadonlyMap<number, number> =>
  new Map(rows);

/** One-row platform, top of the ground and dirt, each with its 4 variants. */
function terrainRows(platform: number, top: number): [number, number][] {
  return [0, 1, 2, 3].flatMap((i): [number, number][] => [
    [1 + i, platform + i],
    [21 + i, top + i],
    [121 + i, 121 + i],
  ]);
}

/** Spike and signpost: the same in every theme. */
const SHARED_ROWS: [number, number][] = [
  [69, 69],
  [86, 86],
];

/** Sprout, tall plant, pine and mushroom → what the theme draws in their place. */
function decorRows(
  sprout: number,
  tall: number,
  pine: number,
  mushroom: number,
): [number, number][] {
  return [
    [125, sprout],
    [126, tall],
    [127, pine],
    [129, mushroom],
  ];
}

/** Only the five themes of the base pack; the expansion blocks borrow one (`theme.ts`). */
export const THEME_TILES: Partial<Record<Theme, ReadonlyMap<number, number>>> = {
  meadow: themeTable([...terrainRows(1, 21), ...decorRows(125, 126, 127, 129), ...SHARED_ROWS]),
  forest: themeTable([...terrainRows(1, 21), ...decorRows(129, 127, 127, 129), ...SHARED_ROWS]),
  desert: themeTable([...terrainRows(41, 61), ...decorRows(128, 128, 0, 0), ...SHARED_ROWS]),
  cave: themeTable([...terrainRows(141, 121), ...decorRows(0, 0, 0, 129), ...SHARED_ROWS]),
  snow: themeTable([...terrainRows(81, 101), ...decorRows(0, 127, 127, 146), ...SHARED_ROWS]),
};

/** GIDs a chunk or a manual level may draw: the meadow's (ADR 0012, plan 1g2). */
export const BASE_PALETTE: ReadonlySet<number> = new Set(THEME_TILES.meadow?.keys());
