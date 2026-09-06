import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import {
  exchangeCodeAsync,
  makeRedirectUri,
  useAuthRequest,
  useAutoDiscovery,
} from 'expo-auth-session';
import type {AvatarSeed} from '@/data/avatars';
import {
  MICROSOFT_CLIENT_ID,
  MICROSOFT_DISCOVERY_URL,
  MICROSOFT_SCOPES,
  isMicrosoftConfigured,
} from '@/data/authConfig';
import {UKIM_REJECTION, isUkimEmail} from '@/lib/ukim';

/**
 * Sign-in, through the university's own Microsoft accounts.
 *
 * Outlook rather than Google because UKIM issues every student an address in
 * its directory — so signing in *is* the enrolment check, and the app never
 * has to run a verification queue of its own.
 *
 * The flow is authorization code + PKCE in a system browser sheet, which is
 * the only correct shape for a public client: no client secret ships in the
 * binary, and the code that comes back is useless without the verifier held in
 * memory on this device.
 */

/**
 * The slice of the profile the app actually shows. Deliberately no photo —
 * profiles wear the app's own doodle avatar, seeded by the account id.
 */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type Status = 'restoring' | 'signedOut' | 'signedIn';

/** What lives in SecureStore: the account plus its on-device preferences. */
type StoredSession = {
  user: AuthUser;
  avatarSeed: AvatarSeed | null;
};

type AuthContextValue = {
  status: Status;
  user: AuthUser | null;
  /** The face the user picked; null means "derive one from the account id". */
  avatarSeed: AvatarSeed | null;
  chooseAvatar: (seed: AvatarSeed) => Promise<void>;
  /** Set when the last sign-in attempt failed; cleared on the next attempt. */
  error: string | null;
  /** True while the Microsoft sheet is open and the response is being handled. */
  busy: boolean;
  /** False until the request object is built; the button waits for it. */
  ready: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Signs in as a stand-in student, without Microsoft.
   *
   * Only ever offered in a development build that has no Azure client id yet —
   * `canUseTestSignIn` below is the guard, and it is `false` in any release
   * build, so this cannot become a way into the real app.
   */
  signInAsTestStudent: () => Promise<void>;
  canUseTestSignIn: boolean;
};

/**
 * The stand-in account. Its address is a real UKIM one so the server's own
 * check treats it exactly like any other student — the point is to exercise
 * the app, not to bypass the rule it enforces.
 */
const TEST_STUDENT: AuthUser = {
  id: 'dev-test-student',
  name: 'Test Student',
  email: 'test.student@students.finki.ukim.mk',
};

/** A development build with sign-in not yet configured, and nothing else. */
const canUseTestSignIn = __DEV__ && !isMicrosoftConfigured;

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'netaville.user';

// Closes the browser sheet once the redirect lands. No-op off web, but the
// docs ask for it unconditionally and it costs nothing.
WebBrowser.maybeCompleteAuthSession();

/** Reads a stored record, tolerating one written before avatars were picked. */
function readSession(raw: string): StoredSession {
  const parsed = JSON.parse(raw) as StoredSession | AuthUser;
  return 'user' in parsed ? parsed : {user: parsed, avatarSeed: null};
}

/** What Microsoft Graph returns for /me, of which we want three fields. */
type GraphProfile = {
  id?: unknown;
  displayName?: unknown;
  mail?: unknown;
  userPrincipalName?: unknown;
};

/**
 * Reads the signed-in account from Graph rather than from the id token.
 *
 * The token's claims would save a round trip, but `email` is an optional claim
 * that a tenant need not emit — and the address is the whole enrolment check
 * here, so it has to come from somewhere that always has it. Graph's `mail`
 * falls back to the user principal name, which for a university account is the
 * ukim.mk address either way.
 */
async function fetchProfile(accessToken: string): Promise<AuthUser | null> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {Authorization: `Bearer ${accessToken}`},
  });
  if (!response.ok) {
    return null;
  }
  const profile = (await response.json()) as GraphProfile;

  const id = typeof profile.id === 'string' ? profile.id : null;
  const email =
    typeof profile.mail === 'string' && profile.mail.length > 0
      ? profile.mail
      : typeof profile.userPrincipalName === 'string'
        ? profile.userPrincipalName
        : null;
  if (id === null || email === null) {
    return null;
  }

  return {
    id,
    name: typeof profile.displayName === 'string' ? profile.displayName : email,
    email,
  };
}

export function AuthProvider({children}: {children: ReactNode}) {
  const [status, setStatus] = useState<Status>('restoring');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [avatarSeed, setAvatarSeed] = useState<AvatarSeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // `netaville://auth`, matching the redirect URI registered in Azure. It is
  // derived rather than written out so the scheme has one source: app.json.
  const redirectUri = makeRedirectUri({scheme: 'netaville', path: 'auth'});
  const discovery = useAutoDiscovery(MICROSOFT_DISCOVERY_URL);

  const [request, , promptAsync] = useAuthRequest(
    {
      clientId: MICROSOFT_CLIENT_ID,
      scopes: MICROSOFT_SCOPES,
      redirectUri,
      usePKCE: true,
    },
    discovery,
  );

  // Callers update state first and persist after, so a failed write costs the
  // user nothing this launch — it only means the session is not remembered for
  // the next one. Swallowing it here keeps that out of every call site.
  const persist = useCallback(async (session: StoredSession) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Keychain unavailable; the in-memory session still stands.
    }
  }, []);

  const store = useCallback(
    async (next: AuthUser, seed: AvatarSeed | null = null) => {
      setUser(next);
      setAvatarSeed(seed);
      setStatus('signedIn');
      await persist({user: next, avatarSeed: seed});
    },
    [persist],
  );

  // Cold start: the stored profile is the whole restore path, which keeps
  // launch offline-friendly. There is no silent re-auth to fall back on — the
  // sheet is the only way in, and opening it unasked at launch would be worse
  // than showing the sign-in screen.
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        const saved = await SecureStore.getItemAsync(STORAGE_KEY);
        if (saved !== null && !cancelled) {
          const session = readSession(saved);
          setUser(session.user);
          setAvatarSeed(session.avatarSeed);
          setStatus('signedIn');
          return;
        }
      } catch {
        // A failed restore just means "not signed in".
      }
      if (!cancelled) {
        setStatus('signedOut');
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async () => {
    if (!isMicrosoftConfigured) {
      setError(
        'Outlook sign-in is not configured yet. Add the Azure client id.',
      );
      return;
    }
    if (request === null || discovery === null) {
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const result = await promptAsync();
      if (result.type === 'cancel' || result.type === 'dismiss') {
        return;
      }
      if (result.type !== 'success') {
        setError('Microsoft did not return an account. Try again.');
        return;
      }

      const tokens = await exchangeCodeAsync(
        {
          clientId: MICROSOFT_CLIENT_ID,
          code: result.params.code!,
          redirectUri,
          extraParams: {code_verifier: request.codeVerifier ?? ''},
        },
        discovery,
      );

      const profile =
        tokens.accessToken === undefined
          ? null
          : await fetchProfile(tokens.accessToken);
      if (profile === null) {
        setError('Could not read your Microsoft profile. Try again.');
        return;
      }

      // The gate. A personal Outlook account or another university's address
      // gets this far and no further — and the server checks again, because
      // this one runs on a device the user controls.
      if (!isUkimEmail(profile.email)) {
        setError(UKIM_REJECTION);
        return;
      }

      await store(profile);
    } catch {
      setError(
        "Couldn't reach Microsoft. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }, [request, discovery, promptAsync, redirectUri, store]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      avatarSeed,
      error,
      busy,
      ready: request !== null && discovery !== null,

      chooseAvatar: async seed => {
        setAvatarSeed(seed);
        if (user !== null) {
          await persist({user, avatarSeed: seed});
        }
      },

      signIn,
      canUseTestSignIn,

      signInAsTestStudent: async () => {
        if (!canUseTestSignIn) {
          return;
        }
        setError(null);
        await store(TEST_STUDENT);
      },

      signOut: async () => {
        try {
          await SecureStore.deleteItemAsync(STORAGE_KEY);
        } catch {
          // Nothing stored, or the keychain refused; sign out locally anyway.
        }
        setUser(null);
        setAvatarSeed(null);
        setError(null);
        setStatus('signedOut');
      },
    }),
    [
      status,
      user,
      avatarSeed,
      error,
      busy,
      request,
      discovery,
      signIn,
      persist,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
