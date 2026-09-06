/**
 * Microsoft (Outlook) sign-in for the iOS app.
 *
 * The client id is a public identifier, not a secret — it ships inside every
 * build anyway, so it belongs in the repo. There is deliberately no client
 * secret: the app uses the authorization-code flow with PKCE, which is the
 * only correct shape for a public client. A secret in an app binary is not a
 * secret.
 *
 * Get the id from the Azure portal → App registrations → New registration:
 *   • Supported account types: "Accounts in any organizational directory"
 *     (or UKIM's own tenant only — see TENANT below).
 *   • Platform: iOS/macOS, bundle id mk.netaville.app.
 *   • Add a Mobile/desktop redirect URI of `netaville://auth` — that is
 *     `scheme` from app.json plus the path makeRedirectUri() is given.
 * No API permissions beyond the default User.Read are needed.
 */
export const MICROSOFT_CLIENT_ID = 'ab3a2524-e82c-4348-9199-c9c99559adc5';

/**
 * Which directory may sign in.
 *
 * `organizations` accepts any work or school account and refuses personal
 * Outlook/Hotmail accounts, which is already most of the filter — a private
 * address can never reach the UKIM check below. Replacing this with UKIM's own
 * tenant id (a GUID) narrows it further, so Microsoft turns away non-UKIM staff
 * and students before the app ever sees them. That is the stricter setup and
 * worth doing once the tenant id is known.
 */
export const MICROSOFT_TENANT = 'organizations';

export const MICROSOFT_DISCOVERY_URL = `https://login.microsoftonline.com/${MICROSOFT_TENANT}/v2.0`;

/** openid/profile/email identify the account; User.Read reads the directory profile. */
export const MICROSOFT_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'User.Read',
];

/** Guards the sign-in call against a half-configured build. */
export const isMicrosoftConfigured =
  !MICROSOFT_CLIENT_ID.startsWith('REPLACE_WITH');
