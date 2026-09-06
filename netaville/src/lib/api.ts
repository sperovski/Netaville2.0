import {API_BASE_URL} from '@/data/apiConfig';
import type {AuthUser} from '@/context/auth';

/**
 * The app's one door to the admin panel's API.
 *
 * Every call carries the signed-in Google account, which is how the server
 * knows whose feed and whose RSVPs these are — see lib/student.ts on that side.
 * Nothing is signed yet; when real tokens land, this is the only place the
 * client has to change.
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

function identityHeaders(user: AuthUser): Record<string, string> {
  return {
    'x-netaville-student-id': user.id,
    'x-netaville-student-name': user.name,
    'x-netaville-student-email': user.email,
  };
}

async function request<T>(
  user: AuthUser,
  path: string,
  init: {method?: string; body?: unknown} = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        ...identityHeaders(user),
        ...(init.body === undefined
          ? {}
          : {'Content-Type': 'application/json'}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
  } catch {
    // Wrong Wi-Fi, panel not running, request timed out — all the same to the
    // caller, which shows the cached feed rather than an error.
    throw new ApiError('Could not reach Netaville.', 0);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new ApiError(await errorMessage(response), response.status);
  }
  return (await response.json()) as T;
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

export function fetchEvents(user: AuthUser): Promise<{events: ApiEvent[]}> {
  return request<{events: ApiEvent[]}>(user, '/api/app/events');
}

export function putRsvp(
  user: AuthUser,
  eventId: string,
  going: boolean,
): Promise<{event: ApiEvent}> {
  return request<{event: ApiEvent}>(
    user,
    `/api/app/events/${encodeURIComponent(eventId)}/rsvp`,
    {method: 'PUT', body: {going}},
  );
}

export function submitEventRequest(
  user: AuthUser,
  input: EventRequestInput,
): Promise<unknown> {
  return request(user, '/api/app/requests', {method: 'POST', body: input});
}
