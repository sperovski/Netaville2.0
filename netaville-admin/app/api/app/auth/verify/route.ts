import {NextResponse} from 'next/server';
import {rateLimit} from '@/lib/rateLimit';
import {deviceLabel, issueSession} from '@/lib/appSession';
import {confirmVerification} from '@/lib/emailVerification';
import {createVerifiedUser, logActivity} from '@/lib/store';

/**
 * Step two of joining: the six-digit code.
 *
 * A correct code consumes the pending verification, creates the account — role
 * decided by the address (see createVerifiedUser) — and returns a full session,
 * the same token pair every other sign-in door hands back. A wrong code counts
 * against a five-attempt cap; an expired or exhausted verification is gone and
 * the person starts over at /register.
 */

const CODE = /^\d{6}$/;

type Body = {email?: unknown; code?: unknown};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';

  // Per address and per client: the code is only a million values wide, so the
  // cap on the row plus a limit here is what keeps it from being walked.
  const limited =
    rateLimit(request, 'verify-email', {limit: 20, windowSeconds: 900}, email) ??
    rateLimit(request, 'verify-ip', {limit: 40, windowSeconds: 900});
  if (limited !== null) {
    return limited;
  }

  if (email.length === 0 || !CODE.test(code)) {
    return NextResponse.json(
      {error: 'Enter the six-digit code from the email.'},
      {status: 400},
    );
  }

  const result = await confirmVerification(email, code);
  if (!result.ok) {
    if (result.reason === 'mismatch') {
      return NextResponse.json(
        {error: 'That code is not right. Check it and try again.'},
        {status: 400},
      );
    }
    // 'expired' or 'unknown' — nothing left to verify against.
    return NextResponse.json(
      {error: 'That code has expired. Start again from sign-up.'},
      {status: 410},
    );
  }

  let user;
  try {
    user = await createVerifiedUser(result.account);
  } catch (caught) {
    if (caught instanceof Error && caught.message === 'email exists') {
      return NextResponse.json(
        {error: 'An account with that email already exists.'},
        {status: 409},
      );
    }
    throw caught;
  }

  await logActivity(
    'auth',
    `${user.name} verified ${user.email} and joined as ${user.role}`,
  );

  return NextResponse.json(await issueSession(user, deviceLabel(request)), {
    status: 201,
  });
}
