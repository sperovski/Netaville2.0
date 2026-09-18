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
import type {AvatarSeed} from '@/data/avatars';
import {
  ApiError,
  login,
  register,
  resendVerificationCode,
  revokeSession,
  setSessionLostHandler,
  verifyEmail,
} from '@/lib/api';
import {
  clearSession,
  readSession,
  saveSession,
  type Session,
} from '@/lib/tokenStore';

/**
 * Sign-in, by email and password, for everyone.
 *
 * There used to be two doors — Microsoft for students, email for everyone else.
 * The Microsoft one is gone: it needed an admin at UKIM to grant tenant consent
 * before a single student could get in, and that never happened. Now a student
 * registers with their ukim.mk address like anyone else; the server mails a
 * code to prove they hold the mailbox, and the address is what grants the
 * `student` role once the code is confirmed.
 *
 * So registration is two steps — `signUpWithEmail` then `verifyEmail` — and
 * only the second one produces a session.
 */

/**
 * The slice of the profile the app actually shows. Deliberately no photo —
 * profiles wear the app's own doodle avatar, seeded by the account id.
 */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  /**
   * 'student' is a verified ukim.mk address — the only kind that gets student
   * pricing on the menu. 'member' is any other address, with the same access
   * to everything else.
   */
  kind: 'student' | 'member';
};

type Status = 'restoring' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: Status;
  user: AuthUser | null;
  /** The face the user picked; null means "derive one from the account id". */
  avatarSeed: AvatarSeed | null;
  chooseAvatar: (seed: AvatarSeed) => Promise<void>;
  /** Set when the last attempt failed; cleared on the next one. */
  error: string | null;
  /** Drops a stale error — the auth screens call it when they mount. */
  clearError: () => void;
  /** True while an attempt is in flight. */
  busy: boolean;
  /**
   * Step one of joining. Resolves true when the code has been sent and the
   * caller should move to the verify screen; false with `error` set otherwise.
   */
  signUpWithEmail: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<boolean>;
  /** Step two. Resolves true once the session is live. */
  verifyEmailCode: (input: {email: string; code: string}) => Promise<boolean>;
  /** A fresh code for a pending verification. */
  resendCode: (email: string) => Promise<boolean>;
  /** Coming back in. Resolves true once the session is live. */
  signInWithEmail: (input: {email: string; password: string}) => Promise<boolean>;
  signOut: () => Promise<void>;
  /** Ends every session for this account, on every device. */
  signOutEverywhere: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** The avatar choice — a preference, not a credential, so it lives apart. */
const AVATAR_KEY = 'netaville.avatarSeed';

export function AuthProvider({children}: {children: ReactNode}) {
  const [status, setStatus] = useState<Status>('restoring');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [avatarSeed, setAvatarSeed] = useState<AvatarSeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const adopt = useCallback(async (session: Session) => {
    await saveSession(session);
    setUser(session.user);
    setStatus('signedIn');
  }, []);

  const forget = useCallback(async () => {
    await clearSession();
    setUser(null);
    setStatus('signedOut');
  }, []);

  /**
   * The API client calls this when a refresh fails — the refresh token was
   * revoked, expired, or replayed. There is nothing to salvage, so the app
   * drops to the sign-in screen rather than showing a signed-in shell that
   * cannot load anything.
   */
  useEffect(() => {
    setSessionLostHandler(() => {
      setUser(null);
      setStatus('signedOut');
      setError('Your session ended. Sign in again.');
    });
    return () => setSessionLostHandler(null);
  }, []);

  // Cold start. The stored refresh token is the whole restore path, which keeps
  // launch offline-friendly: the app trusts what is in the keychain and lets
  // the first real request sort out an expired access token.
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const [session, seed] = await Promise.all([
        readSession(),
        SecureStore.getItemAsync(AVATAR_KEY).catch(() => null),
      ]);
      if (cancelled) {
        return;
      }
      if (seed !== null) {
        setAvatarSeed(seed as AvatarSeed);
      }
      if (session !== null) {
        setUser(session.user);
        setStatus('signedIn');
        return;
      }
      setStatus('signedOut');
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const signUpWithEmail = useCallback(
    async (input: {name: string; email: string; password: string}) => {
      setError(null);
      setBusy(true);
      try {
        await register(input);
        return true;
      } catch (caught) {
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'Something went wrong. Try again.',
        );
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const runToSession = useCallback(
    async (attempt: () => Promise<Session>): Promise<boolean> => {
      setError(null);
      setBusy(true);
      try {
        await adopt(await attempt());
        return true;
      } catch (caught) {
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'Something went wrong. Try again.',
        );
        return false;
      } finally {
        setBusy(false);
      }
    },
    [adopt],
  );

  const verifyEmailCode = useCallback(
    (input: {email: string; code: string}) =>
      runToSession(() => verifyEmail(input)),
    [runToSession],
  );

  const signInWithEmail = useCallback(
    (input: {email: string; password: string}) => runToSession(() => login(input)),
    [runToSession],
  );

  const resendCode = useCallback(async (email: string): Promise<boolean> => {
    setError(null);
    try {
      await resendVerificationCode(email);
      return true;
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Could not send a new code. Try again.',
      );
      return false;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      avatarSeed,
      error,
      busy,

      chooseAvatar: async seed => {
        setAvatarSeed(seed);
        await SecureStore.setItemAsync(AVATAR_KEY, seed).catch(() => {});
      },

      signUpWithEmail,
      verifyEmailCode,
      resendCode,
      signInWithEmail,
      clearError,

      signOut: async () => {
        // Tell the server first — after clearing, the token to revoke is gone.
        await revokeSession(false);
        await forget();
        setError(null);
      },

      signOutEverywhere: async () => {
        await revokeSession(true);
        await forget();
        setError(null);
      },
    }),
    [
      status,
      user,
      avatarSeed,
      error,
      busy,
      signUpWithEmail,
      verifyEmailCode,
      resendCode,
      signInWithEmail,
      clearError,
      forget,
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
