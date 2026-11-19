// Ids with a role in the game (ADR 0008), local ids of each sheet (GID = id + 1 in levels).

/** Frames of the player in `tilemap-characters_packed.png` (24×24). */
export const PLAYER_FRAMES = { idle: 0, walk: 1 } as const;
/** Direction the character looks in the sheet; the sprite is mirrored for the other. */
export const PLAYER_FACES_RIGHT = false;

/** The flag in `tilemap_packed.png` (18×18): cloth (2 frames) on top of the pole. */
export const FLAG_TILES = { cloth: [111, 112], pole: 131 } as const;

/** Spikes in the terrain layer of `tilemap_packed.png`: they hurt and are not solid. */
export const SPIKE_TILES = [68] as const;
export const COIN_TILE = 151;
/** Hearts of the HUD. */
export const HEART_TILES = { full: 44, empty: 46 } as const;
/** The spring: extended at rest, compressed for a moment when it launches. */
export const SPRING_TILES = { extended: 108, compressed: 107 } as const;
/** White wings behind the player when it dies (plan 1d, decision 14). */
export const WINGS_TILE = 144;

/** GID of a local id in the level files and in Phaser's tile index. */
export function gidOf(localId: number): number {
  return localId + 1;
}
