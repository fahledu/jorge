// Seed and pseudo-random sequence of a generated level (ADR 0013): the same level number
// always gives the same sequence, on any machine. Never `Math.random` (ADR 0004).

/** Prefix of the seed text: changing it reshuffles every generated level. */
export const SEED_BASE = "jorge";

/** FNV-1a, 32 bits, over the char codes of an ASCII text. */
export function fnv1a32(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

/** Seed of level `n`: FNV-1a of `"jorge:<n>"`. */
export function levelSeed(levelNumber: number): number {
  return fnv1a32(`${SEED_BASE}:${levelNumber}`);
}

/** mulberry32: values in [0, 1), consumed in a fixed order by the generator. */
export function createPrng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
