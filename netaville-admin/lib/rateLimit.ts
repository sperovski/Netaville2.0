import {NextResponse} from 'next/server';

/**
 * A small fixed-window rate limiter for the endpoints worth guessing at:
 * sign-in, sign-up, token refresh.
 *
 * In process memory, deliberately. It is the right size for one Node instance
 * and it is honest about what it is — behind several instances each one keeps
 * its own count, so the effective limit multiplies. That is still far better
 * than nothing for the attack this exists to blunt (someone running a password
 * list against one address), and the moment the panel runs on more than one
 * instance this should move to Redis or the database. The interface below does
 * not change when it does.
 *
 * Not a defence against a distributed attacker, who simply uses more addresses
 * — what actually protects a password there is scrypt in lib/password.ts.
 */

type Bucket = {count: number; resetAt: number};

const buckets = new Map<string, Bucket>();

/** Stops the map growing without bound on a long-lived process. */
function sweep(now: number): void {
  if (buckets.size < 5_000) {
    return;
  }
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export type RateLimit = {
  /** How many requests are allowed in one window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

export type RateVerdict =
  | {ok: true}
  | {ok: false; retryAfterSeconds: number};

export function consume(key: string, rule: RateLimit): RateVerdict {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (existing === undefined || existing.resetAt <= now) {
    buckets.set(key, {count: 1, resetAt: now + rule.windowSeconds * 1000});
    return {ok: true};
  }
  if (existing.count >= rule.limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return {ok: true};
}

/**
 * The caller's address.
 *
 * `x-forwarded-for` is client-controlled unless something upstream overwrites
 * it, so this is only as trustworthy as the deployment: behind Vercel or a
 * reverse proxy that sets it, the left-most entry is the real client; with the
 * server exposed directly, an attacker can rotate the header and slip the
 * limit. Accepted for now — see the note at the top of this file.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded !== null && forwarded.length > 0) {
    return forwarded.split(',')[0]!.trim();
  }
  return request.headers.get('x-real-ip')?.trim() ?? 'unknown';
}

/**
 * Applies a rule and returns a 429 to send back, or null to carry on.
 *
 * `scope` separates the counters so a burst of sign-ups does not also lock the
 * same address out of signing in.
 */
export function rateLimit(
  request: Request,
  scope: string,
  rule: RateLimit,
  extraKey = '',
): NextResponse | null {
  const verdict = consume(`${scope}:${clientKey(request)}:${extraKey}`, rule);
  if (verdict.ok) {
    return null;
  }
  return NextResponse.json(
    {error: 'Too many attempts. Try again in a moment.'},
    {
      status: 429,
      headers: {'Retry-After': String(verdict.retryAfterSeconds)},
    },
  );
}
