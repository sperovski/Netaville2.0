import * as SecureStore from 'expo-secure-store';

/**
 * Where the session lives on the device.
 *
 * Two tokens, kept apart on purpose:
 *
 *   • the access token is short-lived and sent with every request, so it is
 *     read constantly and cached in memory to keep the keychain out of the hot
 *     path;
 *   • the refresh token is the long-lived credential. It is the one worth
 *     stealing, so it never sits in a plain variable longer than a call needs
 *     it and it is written with the strictest keychain class the app can use.
 *
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY` is that class: the item is unreadable while
 * the phone is locked, and — the important half — it is excluded from iCloud
 * Keychain and from encrypted backups, so a session cannot be restored onto a
 * different handset. Losing it on restore is the correct trade: the person
 * signs in again.
 */

const ACCESS_KEY = 'netaville.accessToken';
const REFRESH_KEY = 'netaville.refreshToken';
const USER_KEY = 'netaville.user';

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  kind: 'student' | 'member';
};

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
};

/**
 * The access token, mirrored in memory.
 *
 * Every request reads it; going to the keychain each time would add a native
 * round trip to each one for a value that changes a few times an hour.
 */
let cachedAccess: string | null = null;

export function accessTokenInMemory(): string | null {
  return cachedAccess;
}

export async function saveSession(session: Session): Promise<void> {
  cachedAccess = session.accessToken;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, session.accessToken, OPTIONS),
    SecureStore.setItemAsync(REFRESH_KEY, session.refreshToken, OPTIONS),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user), OPTIONS),
  ]);
}

/** Replaces just the tokens, after a refresh. The account has not changed. */
export async function saveTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  cachedAccess = accessToken;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, accessToken, OPTIONS),
    SecureStore.setItemAsync(REFRESH_KEY, refreshToken, OPTIONS),
  ]);
}

export async function readSession(): Promise<Session | null> {
  try {
    const [accessToken, refreshToken, rawUser] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY, OPTIONS),
      SecureStore.getItemAsync(REFRESH_KEY, OPTIONS),
      SecureStore.getItemAsync(USER_KEY, OPTIONS),
    ]);
    if (refreshToken === null || rawUser === null) {
      return null;
    }
    const user = JSON.parse(rawUser) as StoredUser;
    cachedAccess = accessToken;
    // An access token may legitimately be missing — it is the refresh token
    // that says the session exists, and the next request will mint a new one.
    return {accessToken: accessToken ?? '', refreshToken, user};
  } catch {
    // A corrupt or unreadable item reads as "not signed in" rather than
    // stranding the app on a screen it cannot leave.
    return null;
  }
}

export async function readRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY, OPTIONS);
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  cachedAccess = null;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY, OPTIONS).catch(() => {}),
    SecureStore.deleteItemAsync(REFRESH_KEY, OPTIONS).catch(() => {}),
    SecureStore.deleteItemAsync(USER_KEY, OPTIONS).catch(() => {}),
  ]);
}
