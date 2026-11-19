// Ids with a role in the game (ADR 0008), local ids of each sheet (GID = id + 1 in levels).

/** Frames of the player in `tilemap-characters_packed.png` (24×24). */
export const PLAYER_FRAMES = { idle: 0, walk: 1 } as const;
/** Direction the character looks in the sheet; the sprite is mirrored for the other. */
export const PLAYER_FACES_RIGHT = true;

/** The flag in `tilemap_packed.png` (18×18): cloth (2 frames) on top of the pole. */
export const FLAG_TILES = { cloth: [111, 112], pole: 131 } as const;
