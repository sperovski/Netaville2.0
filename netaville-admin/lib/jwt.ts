import {createHash} from 'node:crypto';
import {SignJWT, jwtVerify, type JWTPayload} from 'jose';
import type {Role} from './types';

/**
 * The access token the mobile app carries.
 *
 * Signed, short-lived, and stateless: every app request presents one and the
 * server verifies it without a database round trip. That is the whole reason
 * the identity headers this replaces are gone — a header said "I am u-123" and
 * the server believed it; a token says the same thing but only the server can
 * have written it.
 *
 * Short-lived on purpose. There is no revocation list for access tokens, so
 * "signed out" or "deactivated" has to become true by expiry rather than by
 * lookup — fifteen minutes is the window in which a stolen one still works,
 * and the refresh token (lib/refreshTokens.ts) is what carries the long-lived
 * right to mint new ones and *is* revocable.
 *
 * HS256 rather than a keypair because one process both signs and verifies. If
 * verification ever has to happen somewhere that must not be able to sign —
 * an edge worker, a second service — move to EdDSA and publish a JWKS; the
 * shape of everything below stays the same.
 */

const ISSUER = 'netaville-admin';
const AUDIENCE = 'netaville-app';
/**
 * A separate audience for the panel's browser session, so a token minted for
 * one surface is rejected by the other even though both are signed with the
 * same key. An app token must never open the panel.
 */
const ADMIN_AUDIENCE = 'netaville-panel';

/** How long an access token is good for. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

/** Dev-only fallback, mirroring ADMIN_DEV_PASSWORD in lib/auth.ts. */
const DEV_SECRET = 'netaville-dev-jwt-secret-not-for-production';

let warned = false;

/**
 * The signing key.
 *
 * Derived by hashing the configured secret to exactly 32 bytes, so an operator
 * can paste any sufficiently random string rather than having to produce a
 * precise length. In production an unset secret is fatal: falling back to a
 * value that is public in this repo would let anyone mint a token for any
 * account, which is the entire thing this file exists to prevent.
 */
function signingKey(): Uint8Array {
  const configured = process.env.APP_JWT_SECRET;
  if (configured !== undefined && configured.length > 0) {
    return new Uint8Array(createHash('sha256').update(configured).digest());
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'APP_JWT_SECRET is not set. Generate one with `openssl rand -base64 48` ' +
        'and set it before starting in production.',
    );
  }
  if (!warned) {
    warned = true;
    console.warn(
      '[netaville] APP_JWT_SECRET is unset — using the public development key. ' +
        'Set it before deploying.',
    );
  }
  return new Uint8Array(createHash('sha256').update(DEV_SECRET).digest());
}

/** What the app is told about itself, and what routes read back off a request. */
export type AccessClaims = {
  userId: string;
  role: Role;
  email: string;
  name: string;
};

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT({
    role: claims.role,
    email: claims.email,
    name: claims.name,
  } satisfies JWTPayload)
    .setProtectedHeader({alg: 'HS256', typ: 'JWT'})
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(signingKey());
}

/**
 * Verifies a token and returns its claims, or null for anything wrong with it
 * — bad signature, expired, wrong issuer or audience, malformed.
 *
 * Never throws for an invalid token: callers turn null into a 401, and an
 * exception here would be a 500 for what is an ordinary, expected event.
 */
export async function verifyAccessToken(
  token: string,
): Promise<AccessClaims | null> {
  try {
    const {payload} = await jwtVerify(token, signingKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });
    const {sub, role, email, name} = payload as JWTPayload & {
      role?: unknown;
      email?: unknown;
      name?: unknown;
    };
    if (
      typeof sub !== 'string' ||
      (role !== 'student' && role !== 'member' && role !== 'admin') ||
      typeof email !== 'string' ||
      typeof name !== 'string'
    ) {
      return null;
    }
    return {userId: sub, role, email, name};
  } catch {
    return null;
  }
}

/** How long a panel sign-in lasts before the admin has to sign in again. */
export const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;

/**
 * The admin panel's session cookie value.
 *
 * Signed rather than the bare user id it used to be. An id is guessable —
 * `newId` is a timestamp and three random characters — and a guessable session
 * cookie is not a session at all. This one cannot be produced without the key.
 */
export async function signAdminSession(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({alg: 'HS256', typ: 'JWT'})
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(ADMIN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_TTL_SECONDS}s`)
    .sign(signingKey());
}

/** The admin's user id, or null if the cookie is missing, forged or stale. */
export async function verifyAdminSession(
  token: string,
): Promise<string | null> {
  try {
    const {payload} = await jwtVerify(token, signingKey(), {
      issuer: ISSUER,
      audience: ADMIN_AUDIENCE,
      algorithms: ['HS256'],
    });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Pulls the bearer token out of an Authorization header, if there is one. */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (header === null) {
    return null;
  }
  const [scheme, ...rest] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') {
    return null;
  }
  const token = rest.join(' ').trim();
  return token.length > 0 ? token : null;
}
