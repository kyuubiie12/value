import "server-only";

/**
 * In-memory login throttle. Per process, so it resets on restart and doesn't
 * span multiple instances — fine for this app's scale. Keyed by email+client so
 * one attacker can't lock a victim out by spamming their address from elsewhere.
 */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const buckets = new Map<string, { count: number; first: number }>();

export interface ThrottleState {
  blocked: boolean;
  retryInMinutes: number;
}

export function checkLoginThrottle(key: string): ThrottleState {
  const b = buckets.get(key);
  if (!b) return { blocked: false, retryInMinutes: 0 };
  if (Date.now() - b.first > WINDOW_MS) {
    buckets.delete(key);
    return { blocked: false, retryInMinutes: 0 };
  }
  if (b.count >= MAX_ATTEMPTS) {
    return {
      blocked: true,
      retryInMinutes: Math.max(
        1,
        Math.ceil((b.first + WINDOW_MS - Date.now()) / 60_000),
      ),
    };
  }
  return { blocked: false, retryInMinutes: 0 };
}

export function recordLoginFailure(key: string): void {
  const b = buckets.get(key);
  if (!b || Date.now() - b.first > WINDOW_MS) {
    buckets.set(key, { count: 1, first: Date.now() });
  } else {
    b.count += 1;
  }
}

export function clearLoginThrottle(key: string): void {
  buckets.delete(key);
}
