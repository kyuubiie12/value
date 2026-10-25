import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, resolving Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Fake network latency so mock services feel like real async data. */
// Kept so the mock services read like real async calls, but it no longer adds
// artificial latency — every page was paying 100–220 ms per call for nothing.
export function delay<T>(value: T, _ms?: number): Promise<T> {
  void _ms;
  return Promise.resolve(value);
}

/** Deterministic pseudo-random in [0, 1) from a string seed — stable mock data. */
export function seededRandom(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
