import type {AuthUser} from '@/context/auth';

/**
 * The payload behind the card's QR code.
 *
 * What the staff scanner reads is a student id and a moment in time. The
 * rotation is not a signature and is not pretending to be one — it exists so
 * that a screenshot passed to a friend stops working within the minute, which
 * is the realistic failure here, not forgery. The server decides whether a
 * scan is honoured, and when real tokens land this is the one file that has to
 * change.
 */

/** How long one code stays valid. Long enough to scan, short enough to rot. */
export const STAMP_CODE_TTL_MS = 60_000;

export type StampCode = {
  /** The string encoded in the QR. */
  value: string;
  /** When it stops being accepted, so the card can count down. */
  expiresAt: number;
};

export function makeStampCode(user: AuthUser, now = Date.now()): StampCode {
  // Snapped to the interval rather than to `now`, so every device holding the
  // same account draws the same code for the same minute — a re-render or a
  // clock read a few milliseconds later must not churn the image.
  const window = Math.floor(now / STAMP_CODE_TTL_MS);
  const expiresAt = (window + 1) * STAMP_CODE_TTL_MS;

  const payload = new URLSearchParams({
    v: '1',
    u: user.id,
    w: String(window),
  });
  return {value: `netaville://stamp?${payload.toString()}`, expiresAt};
}
