import {NextResponse} from 'next/server';
import {
  clearVerification,
  sendVerificationEmail,
  startVerification,
  sweepExpiredVerifications,
} from '@/lib/emailVerification';
import {hashPassword} from '@/lib/password';
import {rateLimit} from '@/lib/rateLimit';
import {userByEmail} from '@/lib/store';

/**
 * Step one of joining: hand over a name, an email and a password, and get a
 * six-digit code sent to that address.
 *
 * No account is created here. The details are parked in `email_verifications`
 * and only become a `users` row when the code comes back at /verify — that is
 * what proves the person can receive mail at the address, which since the
 * Microsoft sign-in was dropped is the only thing standing behind a `student`
 * role. A ukim.mk address is welcome here now; the domain is what will decide
 * the role once the address is confirmed.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
/** scrypt at N=2^17 is deliberately expensive; an unbounded password is a DoS. */
const MAX_PASSWORD = 200;
const MAX_NAME = 120;
/** The longest an email address may be, per RFC 5321. */
const MAX_EMAIL = 254;

type Body = {name?: unknown; email?: unknown; password?: unknown};

export async function POST(request: Request) {
  // Each attempt costs a scrypt hash and an email; the limit is about that
  // work as much as about the accounts.
  const limited = rateLimit(request, 'register', {limit: 5, windowSeconds: 600});
  if (limited !== null) {
    return limited;
  }

  const body = (await request.json().catch(() => ({}))) as Body;

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (name.length === 0 || name.length > MAX_NAME) {
    return NextResponse.json({error: 'Enter your name.'}, {status: 400});
  }
  if (email.length > MAX_EMAIL || !EMAIL.test(email)) {
    return NextResponse.json({error: 'Enter a valid email address.'}, {status: 400});
  }
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      {error: `Use a password of at least ${MIN_PASSWORD} characters.`},
      {status: 400},
    );
  }
  if (password.length > MAX_PASSWORD) {
    return NextResponse.json(
      {error: `Use a password of at most ${MAX_PASSWORD} characters.`},
      {status: 400},
    );
  }
  if ((await userByEmail(email)) !== null) {
    return NextResponse.json(
      {error: 'An account with that email already exists.'},
      {status: 409},
    );
  }

  const passwordHash = await hashPassword(password);
  const code = await startVerification({name, email, passwordHash});

  try {
    await sendVerificationEmail(email, code);
  } catch {
    // The code can't be delivered, so the pending row would only sit there
    // unusable. Drop it and let them try again.
    await clearVerification(email);
    return NextResponse.json(
      {error: "Couldn't send the code just now. Try again in a moment."},
      {status: 502},
    );
  }

  void sweepExpiredVerifications().catch(() => {});

  return NextResponse.json({status: 'verification_sent', email}, {status: 202});
}
