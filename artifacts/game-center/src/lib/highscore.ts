// Simple localStorage-backed high score helpers, shared across games.
// Keys are namespaced so every game keeps its own record.

const PREFIX = "drex-arcade-hs:";

/** Read a numeric high score for a game key (0 if none / unavailable). */
export function getHighScore(key: string): number {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * Store `value` if it beats the stored record.
 * `mode` "max" keeps the highest (scores), "min" keeps the lowest (e.g. fewest attempts).
 * Returns true when a new record was set.
 */
export function submitHighScore(key: string, value: number, mode: "max" | "min" = "max"): boolean {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    const current = raw == null ? null : Number(raw);
    const isRecord =
      current == null ||
      !Number.isFinite(current) ||
      (mode === "max" ? value > current : value < current);
    if (isRecord) {
      localStorage.setItem(PREFIX + key, String(value));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
