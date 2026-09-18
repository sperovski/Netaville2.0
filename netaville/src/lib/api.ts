import {Platform} from 'react-native';
import {API_BASE_URL} from '@/data/apiConfig';
import {
  accessTokenInMemory,
  clearSession,
  readRefreshToken,
  saveTokens,
  type Session,
  type StoredUser,
} from '@/lib/tokenStore';

/**
 * The app's one door to the admin panel's API.
 *
 * Every call carries `Authorization: Bearer <access token>` — a JWT the server
 * signed after the account proved who it was. The app cannot forge one, which
 * is the whole point: the server no longer takes the app's word for anything.
 *
 * Access tokens last minutes, so expiry is the normal case rather than an
 * error, and it is handled here instead of in every screen: a 401 triggers one
 * refresh and one retry, invisibly. If the refresh also fails the session is
 * genuinely over, and `onSessionLost` tells the auth context to sign out.
 */

/** Long enough for a slow phone network, short enough to not look frozen. */
const TIMEOUT_MS = 8000;

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** True when the call never reached the server, as opposed to being refused. */
export function isOffline(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

/**
 * Called when a refresh fails and there is nothing left to try.
 *
 * A callback rather than an import of the auth context, because the context
 * imports this module — the dependency has to run one way.
 */
let onSessionLost: (() => void) | null = null;

export function setSessionLostHandler(handler: (() => void) | null): void {
  onSessionLost = handler;
}

/** Shown in the panel as "signed in on …". Display only. */
function deviceLabel(): string {
  return Platform.OS === 'ios'
    ? `iOS ${String(Platform.Version)}`
    : `Android ${String(Platform.Version)}`;
}

function withTimeout(): {signal: AbortSignal; done: () => void} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return {signal: controller.signal, done: () => clearTimeout(timer)};
}

async function send(
  path: string,
  init: {method?: string; body?: unknown; token?: string | null},
): Promise<Response> {
  const {signal, done} = withTimeout();
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        'x-netaville-device': deviceLabel(),
        ...(init.token === undefined || init.token === null
          ? {}
          : {Authorization: `Bearer ${init.token}`}),
        ...(init.body === undefined
          ? {}
          : {'Content-Type': 'application/json'}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal,
    });
  } catch {
    // Wrong Wi-Fi, panel not running, request timed out — all the same to the
    // caller, which shows the cached feed rather than an error.
    throw new ApiError('Could not reach Netaville.', 0);
  } finally {
    done();
  }
}

/**
 * The in-flight refresh, if there is one.
 *
 * Several requests can hit a 401 at the same moment — the feed and an RSVP,
 * say. Each one refreshing independently would spend the refresh token more
 * than once, and the server treats a second use as theft and revokes the whole
 * family (see lib/refreshTokens.ts on that side). So the first caller starts
 * the refresh and the rest await the same promise.
 */
let refreshing: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refreshToken = await readRefreshToken();
  if (refreshToken === null) {
    return false;
  }

  let response: Response;
  try {
    response = await send('/api/app/auth/refresh', {
      method: 'POST',
      body: {refreshToken},
    });
  } catch {
    // Offline. Not a dead session — keep the tokens and let the caller show
    // its offline state, or the next request will try again.
    return false;
  }

  if (!response.ok) {
    return false;
  }
  const data = (await response.json()) as {
    accessToken?: unknown;
    refreshToken?: unknown;
  };
  if (
    typeof data.accessToken !== 'string' ||
    typeof data.refreshToken !== 'string'
  ) {
    return false;
  }
  await saveTokens(data.accessToken, data.refreshToken);
  return true;
}

function refreshOnce(): Promise<boolean> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/**
 * An authenticated call, with the refresh dance built in.
 *
 * Exactly one retry. A second 401 after a successful refresh means the token
 * is fine and the server is still refusing — a deactivated account, most
 * likely — and retrying further would only loop.
 */
async function request<T>(
  path: string,
  init: {method?: string; body?: unknown} = {},
): Promise<T> {
  let response = await send(path, {...init, token: accessTokenInMemory()});

  if (response.status === 401) {
    const refreshed = await refreshOnce();
    if (!refreshed) {
      await clearSession();
      onSessionLost?.();
      throw new ApiError('Sign in again to continue.', 401);
    }
    response = await send(path, {...init, token: accessTokenInMemory()});
    if (response.status === 401) {
      await clearSession();
      onSessionLost?.();
      throw new ApiError(await errorMessage(response), 401);
    }
  }

  if (!response.ok) {
    throw new ApiError(await errorMessage(response), response.status);
  }
  return (await response.json()) as T;
}

/* ------------------------------------------------------------------ auth -- */

/** What a sign-in door hands back once a session exists. Mirrors AppSession. */
export type AuthResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: StoredUser;
};

/**
 * The unauthenticated auth endpoints. They carry no token — they are how one is
 * obtained. The server's own message is shown verbatim on failure, because
 * "email already in use" or "that code is not right" is exactly what the form
 * needs to say.
 */
async function authRequest(
  path: string,
  body: Record<string, string>,
): Promise<Session> {
  const response = await send(path, {method: 'POST', body});
  if (!response.ok) {
    throw new ApiError(await errorMessage(response), response.status);
  }
  const data = (await response.json()) as AuthResult;
  if (
    typeof data.accessToken !== 'string' ||
    typeof data.refreshToken !== 'string' ||
    typeof data.user !== 'object'
  ) {
    throw new ApiError('Something went wrong. Try again.', 500);
  }
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  };
}

/** Same, for an endpoint whose success body is not a session. */
async function postJson<T>(
  path: string,
  body: Record<string, string>,
): Promise<T> {
  const response = await send(path, {method: 'POST', body});
  if (!response.ok) {
    throw new ApiError(await errorMessage(response), response.status);
  }
  return (await response.json()) as T;
}

/** The server has parked the details and mailed a code. No session yet. */
export type VerificationPending = {status: 'verification_sent'; email: string};

/**
 * Step one of joining: hand over name, email and password. The server replies
 * that a code is on its way — it does *not* create an account or a session.
 * That happens at `verifyEmail` once the code comes back.
 */
export function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<VerificationPending> {
  return postJson('/api/app/auth/register', input);
}

/** Step two: the six-digit code. On success this is a real session. */
export function verifyEmail(input: {
  email: string;
  code: string;
}): Promise<Session> {
  return authRequest('/api/app/auth/verify', input);
}

/** A fresh code for a pending verification, without re-typing the form. */
export function resendVerificationCode(
  email: string,
): Promise<VerificationPending> {
  return postJson('/api/app/auth/verify/resend', {email});
}

export function login(input: {
  email: string;
  password: string;
}): Promise<Session> {
  return authRequest('/api/app/auth/login', input);
}

/**
 * Revokes this device's refresh token server-side.
 *
 * Best effort: the app clears its own tokens regardless, so a failure here
 * (offline, most likely) costs nothing beyond a row that expires on its own.
 */
export async function revokeSession(everywhere = false): Promise<void> {
  const refreshToken = await readRefreshToken();
  if (refreshToken === null && !everywhere) {
    return;
  }
  try {
    await send('/api/app/auth/logout', {
      method: 'POST',
      token: everywhere ? accessTokenInMemory() : null,
      body: {refreshToken, everywhere},
    });
  } catch {
    // Offline. The token expires on the server's own schedule.
  }
}

/** Prefers the server's own wording; falls back to something a user can read. */
async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {error?: unknown};
    if (typeof body.error === 'string' && body.error.length > 0) {
      return body.error;
    }
  } catch {
    // Not JSON — a proxy error page, most likely.
  }
  return response.status === 401
    ? 'Sign in again to continue.'
    : 'Something went wrong. Try again.';
}

/* ------------------------------------------------------------------ data -- */

/** Exactly the shape the server sends; mirrors AppEvent in the panel's types. */
export type ApiEvent = {
  id: string;
  title: string;
  isoDate: string;
  startTime: string;
  endTime: string;
  durationLabel: string;
  room: string;
  category: string;
  rsvp: 'going' | 'none';
  attendeesGoing: number;
  attendeesMaybe: number;
  description: string;
  catering: boolean;
  drinks: boolean;
  openTo: string;
};

/** The dietary vocabulary, mirroring DIETARY_OPTIONS in the panel's types. */
export const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Halal',
  'Gluten-free',
  'Nut-free',
  'Lactose-free',
] as const;

export type Dietary = (typeof DIETARY_OPTIONS)[number];

/** One slot the organiser says would work. */
export type RequestSlot = {
  date: string;
  startTime: string;
  endTime: string;
};

export type EventRequestInput = {
  title: string;
  description: string;
  category: string;
  /** Best first — the panel shows them in this order when deciding. */
  dates: RequestSlot[];
  room: string;
  catering: string;
  dietary: Dietary[];
  foodNotes: string;
  expectedParticipants: number;
};

export function fetchEvents(): Promise<{events: ApiEvent[]}> {
  return request<{events: ApiEvent[]}>('/api/app/events');
}

export function putRsvp(
  eventId: string,
  going: boolean,
): Promise<{event: ApiEvent}> {
  return request<{event: ApiEvent}>(
    `/api/app/events/${encodeURIComponent(eventId)}/rsvp`,
    {method: 'PUT', body: {going}},
  );
}

export function submitEventRequest(
  input: EventRequestInput,
): Promise<unknown> {
  return request('/api/app/requests', {method: 'POST', body: input});
}

/* ----------------------------------------------------------- loyalty -- */

/** The stamp card, exactly as the counter writes it. */
export type ApiCard = {
  stamps: number;
  lifetimeStamps: number;
  rewards: number;
  coffeesRedeemed: number;
  stampsPerReward: number;
};

export type ApiLeaderboardEntry = {
  userId: string;
  displayName: string;
  lifetimeStamps: number;
  monthStamps: number;
  isYou: boolean;
};

export type ApiCardResponse = {
  card: ApiCard;
  rank: number | null;
  leaderboard: ApiLeaderboardEntry[];
};

export function fetchCard(): Promise<ApiCardResponse> {
  return request<ApiCardResponse>('/api/app/card');
}

/** Spends one banked free coffee. Resolves to the card as it now stands. */
export function redeemCoffee(): Promise<{card: ApiCard}> {
  return request<{card: ApiCard}>('/api/app/card/redeem', {method: 'POST'});
}
