/**
 * Seeded PRNG (mulberry32) for deterministic synthetic data.
 * Same seed always yields the same sequence.
 */

const DEFAULT_SEED = Number(process.env.CLEARPATH_SYNTHETIC_SEED) || 42;

export function createSeededRandom(seed: number = DEFAULT_SEED) {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0; // mulberry32
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getDefaultSeed(): number {
  return DEFAULT_SEED;
}

/** Hash a string to a numeric seed (simple djb2). */
export function seedFromString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return h >>> 0;
}
