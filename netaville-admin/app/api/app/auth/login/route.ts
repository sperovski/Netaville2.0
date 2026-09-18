import {NextResponse} from 'next/server';
import {deviceLabel, issueSession} from '@/lib/appSession';
import {verifyPassword} from '@/lib/password';
import {rateLimit} from '@/lib/rateLimit';
import {passwordHashByEmail, touchUser, userByEmail} from '@/lib/store';

/**
 * Signs an app account in with the email and password it registered.
 *
 * Students and members both come through here now — since the Microsoft sign-in
 * was dropped, everyone in the app has a password. Admins do not: an admin
 * address is rejected here exactly like an unknown one, so this can't be used
 * to probe the panel. Every failure returns the same message.
 */

/** Matches the cap in the register route: see the note on scrypt cost there. */
const MAX_PASSWORD = 200;
const MAX_EMAIL = 254;

type Body = {email?: unknown; password?: unknown};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  // Two limits, because they defend different things. The per-address one is
  // what actually blunts a password list run against one account; the per-IP
  // one catches someone spraying one password across many addresses.
  const perAddress = rateLimit(
    request,
    'login-email',
    {limit: 10, windowSeconds: 900},
    email.toLowerCase(),
  );
  if (perAddress !== null) {
    return perAddress;
  }
  const perClient = rateLimit(request, 'login-ip', {limit: 30, windowSeconds: 900});
  if (perClient !== null) {
    return perClient;
  }

  const rejection = NextResponse.json(
    {error: 'Those details do not match an account.'},
    {status: 401},
  );

  if (
    email.length === 0 ||
    email.length > MAX_EMAIL ||
    password.length === 0 ||
    password.length > MAX_PASSWORD
  ) {
    return rejection;
  }

  const user = await userByEmail(email);
  if (
    user === null ||
    (user.role !== 'member' && user.role !== 'student') ||
    !user.active
  ) {
    return rejection;
  }

  const hash = await passwordHashByEmail(email);
  if (hash === null || !(await verifyPassword(password, hash))) {
    return rejection;
  }

  await touchUser(user.id);
  return NextResponse.json(await issueSession(user, deviceLabel(request)));
}
