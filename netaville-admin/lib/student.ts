import {NextResponse} from 'next/server';
import {bearerToken, verifyAccessToken} from './jwt';
import {touchUser, userById} from './store';
import type {User} from './types';

/**
 * Identifies the account behind a call from the mobile app.
 *
 * Every app request carries `Authorization: Bearer <access token>` — a JWT
 * this server signed (lib/jwt.ts), minted only after the caller proved who
 * they were: a Microsoft id_token verified against Microsoft's own keys for a
 * student, or an email and password checked against a scrypt hash for a
 * member. The app cannot forge one, which is the whole difference from the
 * identity headers this replaced.
 *
 * The token is enough to know *who*, but not enough to know whether they are
 * still allowed, so there is still a row read on every request. That is what
 * makes deactivating an account take effect immediately rather than whenever
 * the current token happens to lapse, and it is why `role` is taken from the
 * database rather than from the claim — a student promoted or demoted in the
 * panel should not keep the old answer for the life of a token.
 *
 * Accounts are never created here any more. Provisioning a student happens in
 * /api/app/auth/microsoft, where the identity has actually been verified.
 */

type Gate = {user: User} | {response: NextResponse};

function unauthorised(message = 'Sign in to continue.'): NextResponse {
  return NextResponse.json(
    {error: message},
    // The app treats a 401 as "refresh, then retry once, then sign out", so
    // the challenge header marks this as a token problem rather than a refusal.
    {status: 401, headers: {'WWW-Authenticate': 'Bearer'}},
  );
}

/**
 * Resolves the caller — student or member. Every app route uses this; the
 * returned User carries the role, so a route that cares (student pricing, say)
 * can branch on it.
 */
export async function requireAppUser(request: Request): Promise<Gate> {
  const token = bearerToken(request);
  if (token === null) {
    return {response: unauthorised()};
  }

  const claims = await verifyAccessToken(token);
  if (claims === null) {
    // Bad signature, wrong audience, or — much more often — simply expired.
    return {response: unauthorised('Your session has expired.')};
  }

  const user = await userById(claims.userId);
  if (user === null) {
    return {response: unauthorised()};
  }
  if (!user.active) {
    return {
      response: NextResponse.json(
        {error: 'This account has been deactivated.'},
        {status: 403},
      ),
    };
  }
  // An admin's panel session is not an app session. Keeping the two apart
  // means an app token can never be used against the panel's routes.
  if (user.role !== 'student' && user.role !== 'member') {
    return {response: unauthorised()};
  }

  // Seeing them is what keeps them online; presence is read back from this.
  await touchUser(user.id);
  return {user: {...user, online: true, lastSeen: new Date().toISOString()}};
}

/**
 * Like requireAppUser, but rejects anyone who isn't a verified UKIM student.
 * For routes or branches that are genuinely student-only.
 */
export async function requireStudent(request: Request): Promise<Gate> {
  const gate = await requireAppUser(request);
  if ('response' in gate) {
    return gate;
  }
  if (gate.user.role !== 'student') {
    return {
      response: NextResponse.json(
        {error: 'Netaville is for UKIM students. Sign in with your ukim.mk address.'},
        {status: 403},
      ),
    };
  }
  return gate;
}
