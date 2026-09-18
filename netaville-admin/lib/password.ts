import {randomBytes, scrypt, timingSafeEqual} from 'node:crypto';

/**
 * Password hashing for member accounts.
 *
 * Students never reach here — a UKIM Microsoft sign-in is their whole
 * credential (see lib/ukim.ts). Members are everyone else: they pick an email
 * and a password, and this is where that password is turned into something
 * safe to store and compared on the way back in.
 *
 * scrypt from node:crypto rather than bcrypt/argon2 so there is no native
 * dependency to build — the panel already runs on plain Node. The stored
 * string carries its own parameters and salt, so the cost can be raised later
 * without invalidating existing hashes:
 *
 *   scrypt$<N>$<r>$<p>$<saltB64>$<hashB64>
 */

const KEY_LENGTH = 64;

/** OWASP's floor for scrypt (2024): N=2^17, r=8, p=1. */
const PARAMS = {N: 2 ** 17, r: 8, p: 1} as const;

/** scrypt needs maxmem raised past its 32 MB default for N this large. */
const MAXMEM = 128 * PARAMS.N * PARAMS.r * 2;

function deriveKey(
  password: string,
  salt: Buffer,
  params: {N: number; r: number; p: number},
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      KEY_LENGTH,
      {cost: params.N, blockSize: params.r, parallelization: params.p, maxmem: MAXMEM},
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, PARAMS);
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

/**
 * Constant-time check of a password against a stored hash.
 *
 * Returns false rather than throwing on a malformed stored value, so a corrupt
 * row reads as "wrong password" instead of a 500.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, n, r, p, saltB64, hashB64] = parts;
  const params = {N: Number(n), r: Number(r), p: Number(p)};
  if (!Number.isInteger(params.N) || !Number.isInteger(params.r) || !Number.isInteger(params.p)) {
    return false;
  }

  const expected = Buffer.from(hashB64!, 'base64');
  const actual = await deriveKey(password, Buffer.from(saltB64!, 'base64'), params);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
