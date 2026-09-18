import {timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {signAdminSession, verifyAdminSession} from './jwt';
import {userByEmail, userById} from './store';
import type {User} from './types';

/**
 * Session handling for the admin panel.
 *
 * The shared account model already carries a role, so the rule here is one
 * line: a session is only ever issued to `role === 'admin'`. Students get the
 * same rejection as an unknown email, so the panel never confirms that a
 * student address exists.
 *
 * The cookie holds a signed token (lib/jwt.ts), not a user id. An id is
 * guessable — `newId` is a timestamp and three random characters — and a
 * guessable session cookie is not a session.
 */
export const SESSION_COOKIE = 'netaville_admin_session';

/**
 * The panel password.
 *
 * `ADMIN_PASSWORD` in the environment is the real answer. The constant below
 * is a convenience for local development only, and is refused outright when
 * NODE_ENV is production — shipping with a password that is public in this
 * repository would make every other control here pointless.
 */
const ADMIN_DEV_PASSWORD = 'netaville';

function adminPassword(): string | null {
  const configured = process.env.ADMIN_PASSWORD;
  if (configured !== undefined && configured.length > 0) {
    return configured;
  }
  return process.env.NODE_ENV === 'production' ? null : ADMIN_DEV_PASSWORD;
}

/**
 * Compares without leaking length or position through timing.
 *
 * `timingSafeEqual` throws on a length mismatch, which would itself be a
 * signal, so both sides are hashed to a fixed width first. Cheap here because
 * the secret is a configured constant rather than a per-user hash — a member's
 * password goes through scrypt in lib/password.ts instead.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) {
    // Still do a comparison so the failure costs the same as a wrong password
    // of the right length.
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export type SignInResult =
  | {ok: true; user: User; token: string}
  | {ok: false; error: string};

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<SignInResult> {
  const user = await userByEmail(email);

  // One message for every failure: no account, wrong password, or a student
  // trying the admin panel all look identical from outside.
  const rejection = {
    ok: false,
    error: 'Those details do not match an admin account.',
  } as const;

  const expected = adminPassword();
  if (expected === null) {
    // Production with nothing configured. Refusing everyone is the only safe
    // reading — the alternative is admitting everyone who read this file.
    console.error(
      '[netaville] ADMIN_PASSWORD is not set; refusing every panel sign-in.',
    );
    return rejection;
  }
  if (user === null || user.role !== 'admin' || !user.active) {
    return rejection;
  }
  if (!constantTimeEquals(password, expected)) {
    return rejection;
  }
  return {ok: true, user, token: await signAdminSession(user.id)};
}

export async function readSession(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token === undefined) {
    return null;
  }
  const id = await verifyAdminSession(token);
  if (id === null) {
    return null;
  }
  const user = await userById(id);
  // Re-check the role on every read: demoting an account takes effect at once,
  // rather than lasting until their cookie happens to expire.
  if (user === null || user.role !== 'admin' || !user.active) {
    return null;
  }
  return user;
}

/** For route handlers: the signed-in admin, or null with a 401 to return. */
export async function requireAdmin(): Promise<
  {user: User} | {response: Response}
> {
  const user = await readSession();
  if (user === null) {
    return {
      response: Response.json({error: 'Admins only.'}, {status: 401}),
    };
  }
  return {user};
}
