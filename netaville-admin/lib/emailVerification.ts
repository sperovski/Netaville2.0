import {createHash, randomInt, timingSafeEqual} from 'node:crypto';
import {query, queryOne} from './db';
import {sendMail} from './mailer';

/**
 * The pending half of registration.
 *
 * Since the Microsoft sign-in was dropped, this is what proves a student holds
 * their ukim.mk mailbox: registration parks the account details in
 * `email_verifications`, a code goes to the address, and the `users` row is
 * only created when the code comes back. The role still comes from the address
 * (see createVerifiedUser in lib/store.ts) — this is what makes trusting the
 * address defensible.
 */

const TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;

export type PendingAccount = {
  name: string;
  /** Lowercased. */
  email: string;
  /** Already scrypt-hashed by lib/password.ts. */
  passwordHash: string;
};

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/** A fresh six-digit code, zero-padded, from a CSPRNG. */
function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

function codesMatch(storedHashHex: string, candidate: string): boolean {
  const a = Buffer.from(storedHashHex, 'hex');
  const b = Buffer.from(hashCode(candidate), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Creates or replaces the pending verification for an address, and returns the
 * code so the caller can mail it. A re-registration for the same address lands
 * here as an upsert: new code, attempt count back to zero, fresh expiry.
 */
export async function startVerification(account: PendingAccount): Promise<string> {
  const code = newCode();
  await query(
    `INSERT INTO email_verifications
       (email, code_hash, name, password_hash, attempts, expires_at)
     VALUES (lower($1), $2, $3, $4, 0, now() + make_interval(mins => $5))
     ON CONFLICT (email) DO UPDATE SET
       code_hash     = EXCLUDED.code_hash,
       name          = EXCLUDED.name,
       password_hash = EXCLUDED.password_hash,
       attempts      = 0,
       expires_at    = EXCLUDED.expires_at,
       created_at    = now()`,
    [account.email, hashCode(code), account.name, account.passwordHash, TTL_MINUTES],
  );
  return code;
}

/** Drops the pending row — used when the mail send fails after the upsert. */
export async function clearVerification(email: string): Promise<void> {
  await query(`DELETE FROM email_verifications WHERE email = lower($1)`, [email]);
}

export type ConfirmResult =
  | {ok: true; account: PendingAccount}
  | {ok: false; reason: 'unknown' | 'expired' | 'mismatch'};

/**
 * Checks a code and, on success, consumes the pending row and hands back the
 * account to create. `expired` also covers "too many wrong guesses" — both mean
 * the same thing to the caller: start over.
 */
export async function confirmVerification(
  email: string,
  code: string,
): Promise<ConfirmResult> {
  const row = await queryOne<{
    code_hash: string;
    name: string;
    password_hash: string;
    attempts: number;
    expires_at: Date;
  }>(
    `SELECT code_hash, name, password_hash, attempts, expires_at
       FROM email_verifications WHERE email = lower($1)`,
    [email],
  );

  if (row === null) {
    return {ok: false, reason: 'unknown'};
  }
  if (row.expires_at.getTime() <= Date.now() || row.attempts >= MAX_ATTEMPTS) {
    await clearVerification(email);
    return {ok: false, reason: 'expired'};
  }
  if (!codesMatch(row.code_hash, code)) {
    await query(
      `UPDATE email_verifications SET attempts = attempts + 1 WHERE email = lower($1)`,
      [email],
    );
    return {ok: false, reason: 'mismatch'};
  }

  // Consume. The DELETE ... RETURNING is what makes two racing confirmations
  // safe: only the one that actually removes the row proceeds to create a user.
  const deleted = await query(
    `DELETE FROM email_verifications WHERE email = lower($1) RETURNING email`,
    [email],
  );
  if (deleted.length === 0) {
    return {ok: false, reason: 'unknown'};
  }
  return {
    ok: true,
    account: {
      name: row.name,
      email: email.trim().toLowerCase(),
      passwordHash: row.password_hash,
    },
  };
}

/**
 * Issues a new code for a verification that is already pending, reusing the
 * name and password hash already stored. Returns null when there is nothing
 * pending for the address.
 */
export async function resendVerification(email: string): Promise<string | null> {
  const row = await queryOne<{name: string; password_hash: string}>(
    `SELECT name, password_hash FROM email_verifications WHERE email = lower($1)`,
    [email],
  );
  if (row === null) {
    return null;
  }
  return startVerification({
    name: row.name,
    email: email.trim().toLowerCase(),
    passwordHash: row.password_hash,
  });
}

/** Opportunistic cleanup, called from the routes that are already writing. */
export async function sweepExpiredVerifications(): Promise<void> {
  await query(
    `DELETE FROM email_verifications WHERE expires_at < now() - INTERVAL '1 hour'`,
  );
}

/** Puts the code in front of the person. */
export async function sendVerificationEmail(
  email: string,
  code: string,
): Promise<void> {
  await sendMail({
    to: email,
    subject: `${code} is your Netaville code`,
    text:
      `Your Netaville verification code is ${code}.\n\n` +
      `It is good for ${TTL_MINUTES} minutes. ` +
      `If you did not ask to join Netaville, ignore this email.`,
    html:
      `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#1a1a2e">` +
      `<p style="font-size:15px">Your Netaville verification code is</p>` +
      `<p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:8px 0">${code}</p>` +
      `<p style="font-size:13px;color:#6b6b7b">Good for ${TTL_MINUTES} minutes. ` +
      `If you did not ask to join Netaville, ignore this email.</p></div>`,
  });
}
