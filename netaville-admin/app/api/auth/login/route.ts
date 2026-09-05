import {NextResponse} from 'next/server';
import {SESSION_COOKIE, verifyCredentials} from '@/lib/auth';
import {logActivity} from '@/lib/store';

export async function POST(request: Request) {
  const body = (await request.json()) as {email?: string; password?: string};
  const result = verifyCredentials(body.email ?? '', body.password ?? '');

  if (!result.ok) {
    return NextResponse.json({error: result.error}, {status: 401});
  }

  result.user.online = true;
  result.user.lastSeen = new Date().toISOString();
  logActivity('auth', `${result.user.name} signed in to the admin panel`);

  const response = NextResponse.json({user: result.user});
  response.cookies.set(SESSION_COOKIE, result.user.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return response;
}
