import {createHash, randomBytes, timingSafeEqual} from 'node:crypto';

/**
 * The token a TV holds.
 *
 * It is issued once, at /tv enrolment, and presented on every feed poll for
 * the life of the device. That makes it exactly a long-lived API key: opaque,
 * high-entropy, and stored only as its SHA-256 so a database leak hands an
 * attacker nothing. No rotation and no salt — a rotation scheme buys nothing
 * for a value that lives on a wall-mounted panel, and there is no dictionary
 * to defend against.
 *
 * This is what replaced the screen id as the credential. The id is `newId`,
 * which is a timestamp and three random characters — fine as a row key, far
 * too weak to be the only thing standing between the open internet and a
 * screen's feed.
 */

/** 32 bytes, URL-safe. */
export function newDeviceToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Constant-time compare of two hex digests. */
export function tokenHashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Pulls the device token off a request. Accepts either an Authorization bearer
 * header or `x-screen-token`, because a `<video>` element cannot set headers
 * and some kiosk browsers are fussy about which one they forward.
 */
export function deviceTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (auth !== null) {
    const [scheme, ...rest] = auth.split(' ');
    if (scheme?.toLowerCase() === 'bearer') {
      const token = rest.join(' ').trim();
      if (token.length > 0) {
        return token;
      }
    }
  }
  const header = request.headers.get('x-screen-token')?.trim();
  return header !== undefined && header.length > 0 ? header : null;
}
