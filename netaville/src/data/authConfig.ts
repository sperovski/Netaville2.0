/**
 * Google OAuth client for the iOS app. This is a public identifier, not a
 * secret — it ships inside every build anyway, so it belongs in the repo.
 *
 * Get it from Google Cloud Console → Credentials → an OAuth client of type
 * iOS, created against the bundle id in app.json (mk.netaville.app). The
 * `iosUrlScheme` in app.json is the same value with its two halves swapped:
 * `123-abc.apps.googleusercontent.com` → `com.googleusercontent.apps.123-abc`.
 */
export const IOS_CLIENT_ID = '957122754658-tmpgkcdqs7uukmq5pcv8dib3k44o1dke.apps.googleusercontent.com';

/** Guards the sign-in call against a half-configured build. */
export const isGoogleConfigured = IOS_CLIENT_ID.endsWith('.apps.googleusercontent.com');
