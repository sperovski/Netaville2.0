import {NextResponse} from 'next/server';
import {revokeAllForUser, revokeByToken} from '@/lib/refreshTokens';
import {requireAppUser} from '@/lib/student';

/**
 * Signs a device out by revoking its refresh-token family.
 *
 * The access token it still holds keeps working until it expires — there is no
 * revocation list for those, by design (see lib/jwt.ts). What signing out
 * actually buys is that no new one can be minted, so the session ends within
 * one access-token lifetime at the outside.
 *
 * `everywhere: true` revokes every family for the account, which is what to
 * offer someone who thinks a device was stolen.
 *
 * Always answers 200. The app clears its own tokens either way, and a failure
 * it cannot act on would only leave it stuck on a screen it is trying to
 * leave.
 */

type Body = {refreshToken?: unknown; everywhere?: unknown};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;

  if (body.everywhere === true) {
    // Revoking every device is a bigger claim than revoking the one holding
    // this token, so it takes a valid access token rather than just the
    // refresh token.
    const gate = await requireAppUser(request);
    if ('response' in gate) {
      return gate.response;
    }
    await revokeAllForUser(gate.user.id);
    return NextResponse.json({ok: true});
  }

  const presented =
    typeof body.refreshToken === 'string' ? body.refreshToken.trim() : '';
  if (presented.length > 0 && presented.length <= 256) {
    await revokeByToken(presented);
  }
  return NextResponse.json({ok: true});
}
