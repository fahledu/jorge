// Ids with a role in the game (ADR 0008), local ids of each sheet (GID = id + 1 in levels).

/** Frames of the player in `tilemap-characters_packed.png` (24×24). */
export const PLAYER_FRAMES = { idle: 0, walk: 1 } as const;
/** Direction the character looks in the sheet; the sprite is mirrored for the other. */
export const PLAYER_FACES_RIGHT = false;

/** Enemies in `tilemap-characters_packed.png`: 2 frames each (plan 1e, decision 11). */
export const ENEMY_FRAMES = { walker: [18, 19], flyer: [24, 25] } as const;
/** The enemies' drawings are symmetric; mirrored like the player when going right. */
export const ENEMY_FACES_RIGHT = false;

/** The flag in `tilemap_packed.png` (18×18): cloth (2 frames) on top of the pole. */
export const FLAG_TILES = { cloth: [111, 112], pole: 131 } as const;

/** Spikes in the terrain layer of `tilemap_packed.png`: they hurt and are not solid. */
export const SPIKE_TILES = [68] as const;
export const COIN_TILE = 151;
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
