type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 5;

/**
 * Best-effort development limiter only.
 * Serverless instances do not share memory, so production should replace this
 * with a durable provider (e.g. Cloudflare/Upstash) before public launch.
 */
export function checkRateLimit(key: string) {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (current.count >= LIMIT) return { allowed: false };
  current.count += 1;
  return { allowed: true };
}
