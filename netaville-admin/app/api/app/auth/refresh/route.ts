import {NextResponse} from 'next/server';
import {ACCESS_TOKEN_TTL_SECONDS, signAccessToken} from '@/lib/jwt';
import {deviceLabel, publicUser} from '@/lib/appSession';
import {rateLimit} from '@/lib/rateLimit';
import {rotateRefreshToken, sweepExpired} from '@/lib/refreshTokens';
import {userById} from '@/lib/store';

/**
 * Trades a refresh token for a fresh pair.
 *
 * This is the only endpoint the app calls without a user having done anything,
 * and it is what keeps a phone signed in for months while access tokens keep
 * expiring every quarter of an hour.
 *
 * The presented token is spent by the exchange — see the rotation and
 * reuse-detection notes in lib/refreshTokens.ts. A refusal here is final: the
 * app clears its tokens and shows the sign-in screen, because there is nothing
 * left it can do with what it holds.
 */

type Body = {refreshToken?: unknown};

export async function POST(request: Request) {
  const limited = rateLimit(request, 'refresh', {limit: 60, windowSeconds: 600});
  if (limited !== null) {
    return limited;
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const presented =
    typeof body.refreshToken === 'string' ? body.refreshToken.trim() : '';
  // Tokens are 32 bytes base64url — 43 characters. Anything wildly off is not
  // worth a database round trip.
  if (presented.length === 0 || presented.length > 256) {
    return NextResponse.json({error: 'Sign in again.'}, {status: 401});
  }

  const rotated = await rotateRefreshToken(presented, deviceLabel(request));
  if (!rotated.ok) {
    // Every reason reads the same from outside. Telling the caller whether a
    // token was unknown, spent or merely stale would confirm which of them it
    // is holding, and the app's response is identical either way.
    return NextResponse.json({error: 'Sign in again.'}, {status: 401});
  }

  const user = await userById(rotated.userId);
  if (user === null || !user.active) {
    return NextResponse.json({error: 'Sign in again.'}, {status: 401});
  }

  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  // Opportunistic housekeeping on a request that is already writing.
  void sweepExpired().catch(() => {});

  return NextResponse.json({
    accessToken,
    refreshToken: rotated.token,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: publicUser(user),
  });
}
