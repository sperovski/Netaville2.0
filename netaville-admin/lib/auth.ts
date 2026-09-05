import {cookies} from 'next/headers';
import {db} from './store';
import type {User} from './types';

/**
 * Session handling for the admin panel.
 *
 * The shared account model already carries a role, so the rule here is one
 * line: a session is only ever issued to `role === 'admin'`. Students get the
 * same rejection as an unknown email, so the panel never confirms that a
 * student address exists.
 *
 * The cookie holds a plain user id because there is no auth server yet. When
 * the real one lands, swap `readSession` for a token verification and nothing
 * else in the app changes.
 */
export const SESSION_COOKIE = 'netaville_admin_session';

/** Dev-only credential. A real deployment verifies against the auth server. */
export const ADMIN_DEV_PASSWORD = 'netaville';

export type SignInResult =
  | {ok: true; user: User}
  | {ok: false; error: string};

export function verifyCredentials(email: string, password: string): SignInResult {
  const user = db.users.find(
    candidate => candidate.email.toLowerCase() === email.trim().toLowerCase(),
  );

  // One message for every failure: no account, wrong password, or a student
  // trying the admin panel all look identical from outside.
  const rejection = {
    ok: false,
    error: 'Those details do not match an admin account.',
  } as const;

  if (user === undefined || user.role !== 'admin' || !user.active) {
    return rejection;
  }
  if (password !== ADMIN_DEV_PASSWORD) {
    return rejection;
  }
  return {ok: true, user};
}

export async function readSession(): Promise<User | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (id === undefined) {
    return null;
  }
  const user = db.users.find(candidate => candidate.id === id);
  // Re-check the role on every read: demoting an account takes effect at once,
  // rather than lasting until their cookie happens to expire.
  if (user === undefined || user.role !== 'admin' || !user.active) {
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
