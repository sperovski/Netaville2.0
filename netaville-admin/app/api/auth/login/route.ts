import {NextResponse} from 'next/server';
import {SESSION_COOKIE, verifyCredentials} from '@/lib/auth';
import {logActivity, touchUser} from '@/lib/store';

export async function POST(request: Request) {
  const body = (await request.json()) as {email?: string; password?: string};
  const result = await verifyCredentials(body.email ?? '', body.password ?? '');

  if (!result.ok) {
    return NextResponse.json({error: result.error}, {status: 401});
  }

  await touchUser(result.user.id);
  await logActivity('auth', `${result.user.name} signed in to the admin panel`);

  const response = NextResponse.json({
    user: {...result.user, online: true, lastSeen: new Date().toISOString()},
  });
  response.cookies.set(SESSION_COOKIE, result.user.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return response;
}
