import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

/**
 * At-rest encryption for the few secrets the panel has to store — right now
 * just the Canva refresh token (lib/canva.ts).
 *
 * AES-256-GCM with a key derived from CANVA_TOKEN_KEY. If that env var is
 * unset the value is stored as plain text with a `plain:` marker — the same
 * dev-grade posture as ADMIN_DEV_PASSWORD in lib/auth.ts, so local setup needs
 * no extra config, and a real deployment sets the key.
 *
 * Format: `gcm:<ivB64>:<tagB64>:<cipherB64>` or `plain:<value>`.
 */

const KEY_ENV = 'CANVA_TOKEN_KEY';

function key(): Buffer | null {
  const raw = process.env[KEY_ENV];
  if (raw === undefined || raw.length === 0) {
    return null;
  }
  // Any string works — hashed to exactly 32 bytes so the operator doesn't have
  // to produce a precise-length key.
  return createHash('sha256').update(raw).digest();
}

export function seal(plain: string): string {
  const k = key();
  if (k === null) {
    return `plain:${plain}`;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', k, iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `gcm:${iv.toString('base64')}:${tag.toString('base64')}:${body.toString('base64')}`;
}

export function open(sealed: string): string {
  if (sealed.startsWith('plain:')) {
    return sealed.slice('plain:'.length);
  }
  const parts = sealed.split(':');
  if (parts.length !== 4 || parts[0] !== 'gcm') {
    throw new Error('secretbox: unrecognised sealed value');
  }
  const k = key();
  if (k === null) {
    throw new Error(
      `secretbox: value is encrypted but ${KEY_ENV} is not set to decrypt it`,
    );
  }
  const [, ivB64, tagB64, bodyB64] = parts;
  const decipher = createDecipheriv(
    'aes-256-gcm',
    k,
    Buffer.from(ivB64!, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagB64!, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(bodyB64!, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
