// Difficulty curve of ADR 0013: blocks of 10 levels (tiers), the window of chunk
// difficulties each tier draws from, how many chunks and how many enemies a level has.

const LEVELS_PER_TIER = 10;
/** Last level number (ADR 0013). */
export const LEVEL_COUNT = 100;
/** Flyers take part from this tier on (ADR 0013). */
export const FLYER_MIN_TIER = 3;
/** The spiky takes part from this tier on, the vertical flyer from the next (ADR 0014). */
export const SPIKY_MIN_TIER = 4;
export const FLYER_V_MIN_TIER = 5;

/** Difficulty block of a level: 1 for levels 1–10, 10 for 91–100. */
export function tierOf(levelNumber: number): number {
  return Math.ceil(levelNumber / LEVELS_PER_TIER);
}

/** Middle chunks of a level, between the start and the finish: 3 on level 1, 9 on 100. */
export function middleChunkCount(levelNumber: number): number {
  return 3 + Math.floor((levelNumber - 1) / 15);
}

/** Share of the eligible enemies that stay active: 0.3 on level 1, 0.9 on level 100. */
export function enemyDensity(levelNumber: number): number {
  return 0.3 + (0.6 * (levelNumber - 1)) / (LEVEL_COUNT - 1);
}

/** Difficulties a tier draws its middle chunks from, inclusive. */
export function difficultyWindow(tier: number): { min: number; max: number } {
  return { min: Math.max(1, tier - 2), max: tier };
}

/** Draw weight of a middle chunk: 3 at the tier, 2 one below, 1 two below, 0 outside. */
export function chunkWeight(tier: number, difficulty: number): number {
  const below = tier - difficulty;
  if (below === 0) return 3;
  if (below === 1) return 2;
  if (below === 2) return 1;
  return 0;
}
