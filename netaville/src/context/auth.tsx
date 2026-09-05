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
import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
  type User as GoogleUser,
} from '@react-native-google-signin/google-signin';
import type {AvatarSeed} from '@/data/avatars';
import {IOS_CLIENT_ID, isGoogleConfigured} from '@/data/authConfig';

/**
 * The slice of the Google profile the app actually shows. Deliberately no
 * photo — profiles wear the app's own doodle avatar, seeded by the account id.
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
  /** True while the Google sheet is open and the response is being handled. */
  busy: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'netaville.user';

GoogleSignin.configure({
  iosClientId: IOS_CLIENT_ID,
  scopes: ['profile', 'email'],
});

/** Reads a stored record, tolerating one written before avatars were picked. */
function readSession(raw: string): StoredSession {
  const parsed = JSON.parse(raw) as StoredSession | AuthUser;
  return 'user' in parsed ? parsed : {user: parsed, avatarSeed: null};
}

function toAuthUser(google: GoogleUser['user']): AuthUser {
  return {
    id: google.id,
    name: google.name ?? google.email,
    email: google.email,
  };
}

export function AuthProvider({children}: {children: ReactNode}) {
  const [status, setStatus] = useState<Status>('restoring');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [avatarSeed, setAvatarSeed] = useState<AvatarSeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  // Cold start: trust the stored profile first, and only fall back to Google
  // when there is nothing on the device — that keeps launch offline-friendly.
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        const saved = await SecureStore.getItemAsync(STORAGE_KEY);
        if (saved !== null) {
          if (!cancelled) {
            const session = readSession(saved);
            setUser(session.user);
            setAvatarSeed(session.avatarSeed);
            setStatus('signedIn');
          }
          return;
        }
        const response = await GoogleSignin.signInSilently();
        // Narrower than isSuccessResponse(), which only types the signIn() union.
        if (!cancelled && response.type === 'success') {
          await store(toAuthUser(response.data.user));
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
  }, [store]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      avatarSeed,
      error,
      busy,

      chooseAvatar: async seed => {
        setAvatarSeed(seed);
        if (user !== null) {
          await persist({user, avatarSeed: seed});
        }
      },

      signIn: async () => {
        if (!isGoogleConfigured) {
          setError(
            'Google sign-in is not configured yet. Add the iOS client id.',
          );
          return;
        }
        setError(null);
        setBusy(true);
        try {
          await GoogleSignin.hasPlayServices();
          const response = await GoogleSignin.signIn();
          if (isSuccessResponse(response)) {
            await store(toAuthUser(response.data.user));
          } else if (!isCancelledResponse(response)) {
            setError('Google did not return an account. Try again.');
          }
        } catch {
          setError(
            "Couldn't reach Google. Check your connection and try again.",
          );
        } finally {
          setBusy(false);
        }
      },

      signOut: async () => {
        try {
          await GoogleSignin.signOut();
        } catch {
          // Already signed out on Google's side — the local clear still stands.
        }
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
    [status, user, avatarSeed, error, busy, store, persist],
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
