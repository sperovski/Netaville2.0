import {NextResponse} from 'next/server';
import {rateLimit} from '@/lib/rateLimit';
import {
  resendVerification,
  sendVerificationEmail,
} from '@/lib/emailVerification';

/**
 * A fresh code for a verification that is already pending — for the "didn't get
 * it" case, without making the person re-type name and password.
 *
 * Held tighter than register: three a quarter-hour per address. Each one issues
 * a new code, so an open resend would be a way to keep the guessing window
 * topped up.
 */

type Body = {email?: unknown};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  const limited =
    rateLimit(request, 'verify-resend', {limit: 3, windowSeconds: 900}, email) ??
    rateLimit(request, 'verify-resend-ip', {limit: 10, windowSeconds: 900});
  if (limited !== null) {
    return limited;
  }

  if (email.length === 0) {
    return NextResponse.json({error: 'Start again from sign-up.'}, {status: 400});
  }

  const code = await resendVerification(email);
  if (code === null) {
    // Nothing pending — either never registered, or it already expired. The
    // same answer either way so this can't confirm which.
    return NextResponse.json(
      {error: 'Nothing to verify for that address. Start again from sign-up.'},
      {status: 410},
    );
  }

  try {
    await sendVerificationEmail(email, code);
  } catch {
    return NextResponse.json(
      {error: "Couldn't send the code just now. Try again in a moment."},
      {status: 502},
    );
  }

  return NextResponse.json({status: 'verification_sent', email}, {status: 202});
}
