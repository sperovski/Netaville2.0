import {ACCESS_TOKEN_TTL_SECONDS, signAccessToken} from './jwt';
import {issueRefreshToken} from './refreshTokens';
import type {User} from './types';

/**
 * What every app sign-in hands back.
 *
 * One shape for all three doors — Microsoft, register, log in — so the app has
 * a single thing to store and a single thing to parse. Kept here rather than
 * in each route so a change to the session shape is one edit.
 */

export type AppSession = {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token lapses; the app refreshes ahead of it. */
  expiresIn: number;
  user: {id: string; name: string; email: string; kind: User['role']};
};

/** The slice of the account the app is allowed to see. */
export function publicUser(user: User): AppSession['user'] {
  return {id: user.id, name: user.name, email: user.email, kind: user.role};
}

export async function issueSession(
  user: User,
  deviceLabel: string,
): Promise<AppSession> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    }),
    issueRefreshToken(user.id, deviceLabel),
  ]);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: publicUser(user),
  };
}

/**
 * A label for the device a session belongs to, from a header the app sets.
 *
 * Only ever displayed — see the column comment in db/schema.sql. Truncated and
 * stripped of control characters so a hostile value cannot break the panel's
 * rendering or smuggle newlines into a log line.
 */
export function deviceLabel(request: Request): string {
  const raw = request.headers.get('x-netaville-device') ?? '';
  const cleaned = raw.replace(/[\p{Cc}\p{Cf}]/gu, '').trim();
  return cleaned.length > 0 ? cleaned.slice(0, 120) : 'A device';
}
