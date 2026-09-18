import {NextResponse} from 'next/server';
import {SESSION_COOKIE, verifyCredentials} from '@/lib/auth';
import {ADMIN_SESSION_TTL_SECONDS} from '@/lib/jwt';
import {rateLimit} from '@/lib/rateLimit';
import {logActivity, touchUser} from '@/lib/store';

export async function POST(request: Request) {
  const limited = rateLimit(request, 'admin-login', {
    limit: 10,
    windowSeconds: 900,
  });
  if (limited !== null) {
    return limited;
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  // Bounded before it reaches the comparison, for the same reason the app's
  // login route bounds its input.
  const email = (body.email ?? '').slice(0, 254);
  const password = (body.password ?? '').slice(0, 200);

  const result = await verifyCredentials(email, password);
  if (!result.ok) {
    return NextResponse.json({error: result.error}, {status: 401});
  }

  await touchUser(result.user.id);
  await logActivity('auth', `${result.user.name} signed in to the admin panel`);

  const response = NextResponse.json({
    user: {...result.user, online: true, lastSeen: new Date().toISOString()},
  });
  response.cookies.set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    // Over TLS only, wherever there is TLS to be had. Left off in development
    // so the cookie still works over http://localhost.
    secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });
  return response;
}
