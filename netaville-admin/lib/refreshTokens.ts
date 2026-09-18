import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {query, queryOne} from './db';

/**
 * Refresh tokens: the long-lived half of the app's session.
 *
 * The access token (lib/jwt.ts) is stateless and expires in minutes. This is
 * the part that lets a phone stay signed in for months without keeping a
 * password around, and — because it is stored — the part that can actually be
 * taken away again.
 *
 * Three properties matter here:
 *
 *   • Opaque, not a JWT. There is nothing to read out of it and no signature
 *     to get wrong; it is 32 random bytes whose only meaning is that a row
 *     matches. That also means revocation is a single UPDATE.
 *   • Stored hashed. Only SHA-256 of the token is written, so the table is
 *     useless to anyone who reads it. No salt and no slow KDF, unlike a
 *     password: the input is already 256 bits of entropy, so there is no
 *     dictionary to run and nothing for a salt to defend against.
 *   • Rotated, with reuse detection. Each exchange invalidates the token
 *     presented and issues a fresh one in the same family. Presenting a spent
 *     token means it was replayed — by the real device or by a thief holding
 *     a copy, and the server cannot distinguish those — so the whole family is
 *     revoked and that device has to sign in again.
 */

/** Long enough that a phone in a drawer for a term is still signed in. */
const REFRESH_TTL_DAYS = 90;

export type RefreshRow = {
  token_hash: string;
  user_id: string;
  family: string;
  used_at: Date | null;
  revoked_at: Date | null;
  expires_at: Date;
};

/** SHA-256, hex. Fast on purpose — see the note on hashing above. */
function digest(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newToken(): string {
  return randomBytes(32).toString('base64url');
}

function expiry(): Date {
  return new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Starts a new chain. Called once per sign-in, so each device gets its own
 * family and signing one out leaves the others alone.
 */
export async function issueRefreshToken(
  userId: string,
  deviceLabel = 'A device',
): Promise<string> {
  const token = newToken();
  await query(
    `INSERT INTO refresh_tokens (token_hash, user_id, family, expires_at, device_label)
     VALUES ($1, $2, $3, $4, $5)`,
    [digest(token), userId, randomUUID(), expiry(), deviceLabel.slice(0, 120)],
  );
  return token;
}

export type RotateResult =
  | {ok: true; token: string; userId: string}
  | {ok: false; reason: 'unknown' | 'expired' | 'reused' | 'revoked'};

/**
 * Exchanges a refresh token for the next one in its family.
 *
 * The read and the write are one statement each but the order matters: mark
 * the presented token used *before* inserting its successor, so two refreshes
 * racing on the same token cannot both succeed. The `used_at IS NULL` guard on
 * the UPDATE is what makes that atomic — the loser matches no row and is
 * treated as reuse.
 */
export async function rotateRefreshToken(
  presented: string,
  deviceLabel = 'A device',
): Promise<RotateResult> {
  const hash = digest(presented);
  const row = await queryOne<RefreshRow>(
    `SELECT token_hash, user_id, family, used_at, revoked_at, expires_at
       FROM refresh_tokens WHERE token_hash = $1`,
    [hash],
  );

  if (row === null) {
    return {ok: false, reason: 'unknown'};
  }
  if (row.revoked_at !== null) {
    return {ok: false, reason: 'revoked'};
  }
  if (row.used_at !== null) {
    // Replay. Whoever else holds this token is now also locked out.
    await revokeFamily(row.family);
    return {ok: false, reason: 'reused'};
  }
  if (row.expires_at.getTime() <= Date.now()) {
    return {ok: false, reason: 'expired'};
  }

  // Claim the token. If another request got here first this updates no rows,
  // and the retry below reads it back as already used.
  const claimed = await query(
    `UPDATE refresh_tokens SET used_at = now()
      WHERE token_hash = $1 AND used_at IS NULL AND revoked_at IS NULL
      RETURNING token_hash`,
    [hash],
  );
  if (claimed.length === 0) {
    await revokeFamily(row.family);
    return {ok: false, reason: 'reused'};
  }

  const next = newToken();
  await query(
    `INSERT INTO refresh_tokens (token_hash, user_id, family, expires_at, device_label)
     VALUES ($1, $2, $3, $4, $5)`,
    [digest(next), row.user_id, row.family, expiry(), deviceLabel.slice(0, 120)],
  );
  return {ok: true, token: next, userId: row.user_id};
}

/** Signs one device out. */
export async function revokeFamily(family: string): Promise<void> {
  await query(
    `UPDATE refresh_tokens SET revoked_at = now()
      WHERE family = $1 AND revoked_at IS NULL`,
    [family],
  );
}

/** Signs one device out, given the token it holds. Used by /logout. */
export async function revokeByToken(presented: string): Promise<void> {
  const row = await queryOne<{family: string}>(
    `SELECT family FROM refresh_tokens WHERE token_hash = $1`,
    [digest(presented)],
  );
  if (row !== null) {
    await revokeFamily(row.family);
  }
}

/**
 * Signs every device out. The panel calls this when an account is deactivated,
 * so "deactivated" takes effect within one access-token lifetime everywhere
 * rather than only at the next sign-in.
 */
export async function revokeAllForUser(userId: string): Promise<void> {
  await query(
    `UPDATE refresh_tokens SET revoked_at = now()
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
}

/**
 * Drops rows that can never be presented again. Nothing schedules this yet;
 * it is called opportunistically from the refresh route, which is the one
 * place already paying for a write.
 */
export async function sweepExpired(): Promise<void> {
  await query(
    `DELETE FROM refresh_tokens
      WHERE expires_at < now() - INTERVAL '7 days'
         OR (revoked_at IS NOT NULL AND revoked_at < now() - INTERVAL '7 days')`,
  );
}
