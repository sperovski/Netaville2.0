import type {PoolClient} from 'pg';
import {query, queryOne, transaction} from './db';
import type {
  Activity,
  ActivityKind,
  Dietary,
  EventCategory,
  EventRequest,
  RequestDate,
  NetavilleEvent,
  Playlist,
  RequestStatus,
  Screen,
  ScreenTheme,
  Slide,
  StampCard,
  StampEvent,
  StampEventKind,
  User,
} from './types';
import {STAMPS_PER_REWARD} from './types';

/**
 * Every read and write the panel and the app make.
 *
 * Route handlers and pages call the functions below and never see SQL, a row
 * shape or a connection. That boundary is the point: the tables use snake_case
 * and Postgres types, the rest of the codebase uses the camelCase shapes in
 * lib/types.ts, and the mapping happens here once.
 *
 * Everything is async, because it is a real database now.
 */

/* ------------------------------------------------------------------ ids -- */

let counter = 0;

/**
 * Ids stay app-generated rather than becoming `serial`, because the fixtures
 * and the mobile app already carry values like 'u-admin' and 'e-3'.
 *
 * The data outlives the process now, so the counter alone is not enough — it
 * restarts at zero while the old ids are still in the table. The timestamp and
 * the random suffix are what actually keep them apart.
 */
export function newId(prefix: string): string {
  counter += 1;
  const random = Math.floor(Math.random() * 36 ** 3)
    .toString(36)
    .padStart(3, '0');
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${random}`;
}

/* -------------------------------------------------------------- presence -- */

/**
 * How recently something must have been seen to count as online.
 *
 * Presence is computed from `last_seen` on every read rather than stored. A
 * stored flag has to be cleared by whoever set it, and nothing clears it when
 * a phone goes into a tunnel or the server restarts — the row would just say
 * "online" forever.
 */
const STUDENT_ONLINE = "interval '5 minutes'";
const SCREEN_ONLINE = "interval '45 seconds'";

/* --------------------------------------------------------------- mapping -- */

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  online: boolean;
  last_seen: Date;
  joined_at: string;
  events_attended: number;
  rsvps: number;
  active: boolean;
};

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    online: row.online,
    lastSeen: row.last_seen.toISOString(),
    joinedAt: row.joined_at,
    eventsAttended: row.events_attended,
    rsvps: row.rsvps,
    active: row.active,
  };
}

// `online` is not a column, so every user query has to select the expression.
const USER_COLUMNS = `
  id, name, email, role, last_seen, joined_at, events_attended, rsvps, active,
  (last_seen > now() - ${STUDENT_ONLINE}) AS online`;

type RequestRow = {
  id: string;
  title: string;
  description: string;
  requester_id: string;
  category: EventCategory;
  room: string;
  catering: string;
  dietary: string[];
  food_notes: string;
  expected_participants: number;
  status: RequestStatus;
  chosen_date_id: string | null;
  reason: string | null;
  submitted_at: Date;
};

type RequestDateRow = {
  id: string;
  request_id: string;
  position: number;
  date: string;
  start_time: string;
  end_time: string;
};

function toRequestDate(row: RequestDateRow): RequestDate {
  return {
    id: row.id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
  };
}

function toRequest(row: RequestRow, dates: RequestDate[]): EventRequest {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    requesterId: row.requester_id,
    category: row.category,
    dates,
    ...(row.chosen_date_id === null ? {} : {chosenDateId: row.chosen_date_id}),
    room: row.room,
    catering: row.catering,
    dietary: row.dietary as Dietary[],
    foodNotes: row.food_notes,
    expectedParticipants: row.expected_participants,
    status: row.status,
    // The type calls `reason` optional, so an absent one is undefined rather
    // than null — JSON.stringify drops it and the shape matches the app's.
    ...(row.reason === null ? {} : {reason: row.reason}),
    submittedAt: row.submitted_at.toISOString(),
  };
}

type EventRow = {
  id: string;
  title: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  room: string;
  category: EventCategory;
  price_info: string;
  cafeteria_discount: number;
  catering: string;
  dietary: string[];
  food_notes: string;
  drinks: boolean;
  open_to: string;
  published: boolean;
  from_request_id: string | null;
};

function toEvent(row: EventRow): NetavilleEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    room: row.room,
    category: row.category,
    priceInfo: row.price_info,
    cafeteriaDiscount: row.cafeteria_discount,
    catering: row.catering,
    dietary: row.dietary as Dietary[],
    foodNotes: row.food_notes,
    drinks: row.drinks,
    openTo: row.open_to,
    published: row.published,
    ...(row.from_request_id === null
      ? {}
      : {fromRequestId: row.from_request_id}),
  };
}

type ScreenRow = {
  id: string;
  name: string;
  location: string;
  theme: ScreenTheme;
  pairing_code: string;
  paired: boolean;
  online: boolean;
  last_seen: Date;
  active_playlist_id: string | null;
};

function toScreen(row: ScreenRow): Screen {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    theme: row.theme,
    pairingCode: row.pairing_code,
    paired: row.paired,
    online: row.online,
    lastSeen: row.last_seen.toISOString(),
    activePlaylistId: row.active_playlist_id,
  };
}

const SCREEN_COLUMNS = `
  id, name, location, theme, pairing_code, paired, last_seen, active_playlist_id,
  (last_seen > now() - ${SCREEN_ONLINE}) AS online`;

type SlideRow = {
  id: string;
  playlist_id: string;
  position: number;
  type: Slide['type'];
  image_url: string | null;
  event_id: string | null;
  headline: string | null;
  cta: string | null;
  event_limit: number;
  duration_sec: number;
  enabled: boolean;
  start_at: Date | null;
  end_at: Date | null;
};

function toSlide(row: SlideRow): Slide {
  return {
    id: row.id,
    type: row.type,
    ...(row.image_url === null ? {} : {imageUrl: row.image_url}),
    ...(row.event_id === null ? {} : {eventId: row.event_id}),
    ...(row.headline === null ? {} : {headline: row.headline}),
    ...(row.cta === null ? {} : {cta: row.cta}),
    ...(row.type === 'upcoming' ? {eventLimit: row.event_limit} : {}),
    durationSec: row.duration_sec,
    enabled: row.enabled,
    ...(row.start_at === null ? {} : {startAt: row.start_at.toISOString()}),
    ...(row.end_at === null ? {} : {endAt: row.end_at.toISOString()}),
  };
}

type PlaylistRow = {
  id: string;
  screen_id: string;
  name: string;
  active: boolean;
  updated_at: Date;
};

type ActivityRow = {id: string; kind: ActivityKind; message: string; at: Date};

function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    kind: row.kind,
    message: row.message,
    at: row.at.toISOString(),
  };
}

/* -------------------------------------------------------------- activity -- */

/** How many entries the feed keeps. Older ones are pruned on every write. */
const ACTIVITY_LIMIT = 40;

export async function logActivity(
  kind: ActivityKind,
  message: string,
  client?: PoolClient,
): Promise<Activity> {
  const run = client
    ? async (text: string, params: unknown[]) =>
        (await client.query(text, params)).rows
    : async (text: string, params: unknown[]) => query(text, params);

  const [row] = (await run(
    `INSERT INTO activity (id, kind, message) VALUES ($1, $2, $3) RETURNING *`,
    [newId('a'), kind, message],
  )) as ActivityRow[];

  await run(
    `DELETE FROM activity WHERE id NOT IN (
       SELECT id FROM activity ORDER BY at DESC LIMIT $1)`,
    [ACTIVITY_LIMIT],
  );

  return toActivity(row!);
}

export async function recentActivity(limit: number): Promise<Activity[]> {
  const rows = await query<ActivityRow>(
    'SELECT * FROM activity ORDER BY at DESC LIMIT $1',
    [limit],
  );
  return rows.map(toActivity);
}

/* ----------------------------------------------------------------- users -- */

export async function userById(id: string): Promise<User | null> {
  const row = await queryOne<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
    [id],
  );
  return row === null ? null : toUser(row);
}

export async function userByEmail(email: string): Promise<User | null> {
  const row = await queryOne<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE lower(email) = lower($1)`,
    [email.trim()],
  );
  return row === null ? null : toUser(row);
}

/** Students, most recently active first, optionally filtered by a search box. */
export async function listStudents(search = ''): Promise<User[]> {
  const term = search.trim();
  const rows = await query<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users
     WHERE role = 'student'
       AND ($1 = '' OR name ILIKE '%' || $1 || '%' OR email ILIKE '%' || $1 || '%')
     ORDER BY (last_seen > now() - ${STUDENT_ONLINE}) DESC, name`,
    [term],
  );
  return rows.map(toUser);
}

export async function countStudents(): Promise<{
  total: number;
  online: number;
}> {
  const row = await queryOne<{total: string; online: string}>(
    `SELECT count(*)::text AS total,
            count(*) FILTER (
              WHERE active AND last_seen > now() - ${STUDENT_ONLINE}
            )::text AS online
     FROM users WHERE role = 'student'`,
  );
  return {total: Number(row?.total ?? 0), online: Number(row?.online ?? 0)};
}

/** Records that we just heard from someone, which is what keeps them online. */
export async function touchUser(id: string): Promise<void> {
  await query('UPDATE users SET last_seen = now() WHERE id = $1', [id]);
}

export async function createStudent(input: {
  id: string;
  name: string;
  email: string;
}): Promise<User> {
  const row = await queryOne<UserRow>(
    `INSERT INTO users (id, name, email, role, last_seen, joined_at)
     VALUES ($1, $2, $3, 'student', now(), current_date)
     RETURNING ${USER_COLUMNS}`,
    [input.id, input.name, input.email],
  );
  return toUser(row!);
}

export async function setStudentActive(
  id: string,
  active: boolean,
): Promise<User | null> {
  const row = await queryOne<UserRow>(
    `UPDATE users SET active = $2
     WHERE id = $1 AND role = 'student'
     RETURNING ${USER_COLUMNS}`,
    [id, active],
  );
  return row === null ? null : toUser(row);
}

/* -------------------------------------------------------------- requests -- */

/** A request with its author's name and email already looked up. */
export type RequestWithRequester = EventRequest & {
  requester: string;
  requesterEmail: string;
};

/**
 * Attaches each request's proposed slots.
 *
 * One extra query for the whole page rather than one per request: a queue of
 * thirty requests with three slots each is still two round trips.
 */
async function withDates<Row extends RequestRow>(
  rows: Row[],
): Promise<Map<string, RequestDate[]>> {
  const byRequest = new Map<string, RequestDate[]>(
    rows.map(row => [row.id, []]),
  );
  if (rows.length === 0) {
    return byRequest;
  }
  const slots = await query<RequestDateRow>(
    `SELECT * FROM request_dates WHERE request_id = ANY($1::text[])
     ORDER BY request_id, position`,
    [rows.map(row => row.id)],
  );
  for (const slot of slots) {
    byRequest.get(slot.request_id)?.push(toRequestDate(slot));
  }
  return byRequest;
}

export async function listRequests(
  status?: RequestStatus,
): Promise<RequestWithRequester[]> {
  const rows = await query<
    RequestRow & {requester: string; requester_email: string}
  >(
    `SELECT r.*,
            coalesce(u.name, 'Unknown student') AS requester,
            coalesce(u.email, '')               AS requester_email
     FROM event_requests r
     LEFT JOIN users u ON u.id = r.requester_id
     WHERE $1::text IS NULL OR r.status = $1
     ORDER BY r.submitted_at DESC`,
    [status ?? null],
  );
  const dates = await withDates(rows);
  return rows.map(row => ({
    ...toRequest(row, dates.get(row.id) ?? []),
    requester: row.requester,
    requesterEmail: row.requester_email,
  }));
}

export async function countPendingRequests(): Promise<number> {
  const row = await queryOne<{n: string}>(
    "SELECT count(*)::text AS n FROM event_requests WHERE status = 'pending'",
  );
  return Number(row?.n ?? 0);
}

export type NewRequest = {
  title: string;
  description: string;
  requesterId: string;
  category: EventCategory;
  /** At least one, at most four. The order is the organiser's preference. */
  dates: {date: string; startTime: string; endTime: string}[];
  room: string;
  catering: string;
  dietary: Dietary[];
  foodNotes: string;
  expectedParticipants: number;
};

export async function createRequest(input: NewRequest): Promise<EventRequest> {
  return transaction(async client => {
    const id = newId('r');
    const {rows} = await client.query<RequestRow>(
      `INSERT INTO event_requests
         (id, title, description, requester_id, category, room, catering,
          dietary, food_notes, expected_participants, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
       RETURNING *`,
      [
        id,
        input.title,
        input.description,
        input.requesterId,
        input.category,
        input.room,
        input.catering,
        input.dietary,
        input.foodNotes,
        input.expectedParticipants,
      ],
    );

    const dates: RequestDate[] = [];
    for (const [position, slot] of input.dates.entries()) {
      const {rows: created} = await client.query<RequestDateRow>(
        `INSERT INTO request_dates
           (id, request_id, position, date, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [newId('rd'), id, position, slot.date, slot.startTime, slot.endTime],
      );
      dates.push(toRequestDate(created[0]!));
    }

    return toRequest(rows[0]!, dates);
  });
}

export async function requestById(id: string): Promise<EventRequest | null> {
  const row = await queryOne<RequestRow>(
    'SELECT * FROM event_requests WHERE id = $1',
    [id],
  );
  if (row === null) {
    return null;
  }
  const dates = await query<RequestDateRow>(
    'SELECT * FROM request_dates WHERE request_id = $1 ORDER BY position',
    [id],
  );
  return toRequest(row, dates.map(toRequestDate));
}

/**
 * Rejects a pending request.
 *
 * The `status = 'pending'` in the UPDATE is the guard, not a check the caller
 * made a moment earlier: two admins clicking at once would both pass a
 * read-then-write check, and only one can win a conditional UPDATE.
 */
export async function rejectRequest(
  id: string,
  reason: string,
): Promise<EventRequest | null> {
  return transaction(async client => {
    const {rows} = await client.query<RequestRow>(
      `UPDATE event_requests SET status = 'rejected', reason = $2
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, reason],
    );
    if (rows.length === 0) {
      return null;
    }
    const {rows: slots} = await client.query<RequestDateRow>(
      'SELECT * FROM request_dates WHERE request_id = $1 ORDER BY position',
      [id],
    );
    const entry = toRequest(rows[0]!, slots.map(toRequestDate));
    await logActivity('rejection', `Rejected “${entry.title}”`, client);
    return entry;
  });
}

export type ApprovalOverrides = {
  /** Which proposed slot to run it on. Defaults to the organiser's first. */
  chosenDateId?: string;
  category?: EventCategory;
  priceInfo?: string;
  cafeteriaDiscount?: number;
  drinks?: boolean;
  openTo?: string;
};

/** Approving a request whose chosen slot is not one of its own proposals. */
export type ApproveFailure = {error: 'noSuchDate'};

/**
 * Approves a pending request and publishes the event it becomes.
 *
 * Both writes and the activity entry share one transaction: an approved
 * request with no event is a student told yes about something that is not in
 * the feed, which is worse than the approval failing outright.
 */
export async function approveRequest(
  id: string,
  overrides: ApprovalOverrides,
): Promise<
  {request: EventRequest; event: NetavilleEvent} | ApproveFailure | null
> {
  return transaction(async client => {
    // The slots are read first and under the same lock as the status flip, so
    // the chosen one cannot be edited away between the check and the write.
    const {rows: slots} = await client.query<RequestDateRow>(
      `SELECT d.* FROM request_dates d
       JOIN event_requests r ON r.id = d.request_id
       WHERE d.request_id = $1 ORDER BY d.position
       FOR UPDATE OF r`,
      [id],
    );
    if (slots.length === 0) {
      return null;
    }
    const chosen =
      overrides.chosenDateId === undefined
        ? slots[0]!
        : slots.find(slot => slot.id === overrides.chosenDateId);
    if (chosen === undefined) {
      return {error: 'noSuchDate' as const};
    }

    const {rows} = await client.query<RequestRow>(
      `UPDATE event_requests SET status = 'approved', chosen_date_id = $2
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, chosen.id],
    );
    if (rows.length === 0) {
      return null;
    }
    const entry = toRequest(rows[0]!, slots.map(toRequestDate));

    const {rows: authors} = await client.query<{name: string}>(
      'SELECT name FROM users WHERE id = $1',
      [entry.requesterId],
    );

    const {rows: created} = await client.query<EventRow>(
      `INSERT INTO events
         (id, title, description, date, start_time, end_time, room, category,
          price_info, cafeteria_discount, catering, dietary, food_notes,
          drinks, open_to, published, from_request_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
               $15, true, $16)
       RETURNING *`,
      [
        newId('e'),
        entry.title,
        // The organiser's own description if they wrote one; otherwise a line
        // saying whose event it is, which is better than an empty card.
        entry.description.trim().length > 0
          ? entry.description
          : `Requested by ${authors[0]?.name ?? 'a student'}.`,
        chosen.date,
        chosen.start_time,
        chosen.end_time,
        entry.room,
        overrides.category ?? entry.category,
        overrides.priceInfo ?? 'Free',
        overrides.cafeteriaDiscount ?? 0,
        entry.catering,
        entry.dietary,
        entry.foodNotes,
        overrides.drinks ?? false,
        overrides.openTo ?? 'Open to all',
        entry.id,
      ],
    );

    await logActivity(
      'approval',
      `Approved “${entry.title}” and published the event`,
      client,
    );
    return {request: entry, event: toEvent(created[0]!)};
  });
}

/* ---------------------------------------------------------------- events -- */

export async function listEvents(): Promise<NetavilleEvent[]> {
  const rows = await query<EventRow>(
    'SELECT * FROM events ORDER BY date, start_time',
  );
  return rows.map(toEvent);
}

export async function listPublishedEvents(): Promise<NetavilleEvent[]> {
  const rows = await query<EventRow>(
    'SELECT * FROM events WHERE published ORDER BY date, start_time',
  );
  return rows.map(toEvent);
}

/** Published events from today onwards — what the dashboard calls "upcoming". */
export async function listUpcomingEvents(): Promise<NetavilleEvent[]> {
  const rows = await query<EventRow>(
    `SELECT * FROM events
     WHERE published AND date >= current_date
     ORDER BY date, start_time`,
  );
  return rows.map(toEvent);
}

export async function countUnpublishedEvents(): Promise<number> {
  const row = await queryOne<{n: string}>(
    'SELECT count(*)::text AS n FROM events WHERE NOT published',
  );
  return Number(row?.n ?? 0);
}

export async function eventById(id: string): Promise<NetavilleEvent | null> {
  const row = await queryOne<EventRow>('SELECT * FROM events WHERE id = $1', [
    id,
  ]);
  return row === null ? null : toEvent(row);
}

export async function createEvent(
  input: Omit<NetavilleEvent, 'id'>,
): Promise<NetavilleEvent> {
  const row = await queryOne<EventRow>(
    `INSERT INTO events
       (id, title, description, date, start_time, end_time, room, category,
        price_info, cafeteria_discount, catering, drinks, open_to, published)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      newId('e'),
      input.title,
      input.description,
      input.date,
      input.startTime,
      input.endTime,
      input.room,
      input.category,
      input.priceInfo,
      input.cafeteriaDiscount,
      input.catering,
      input.dietary,
      input.foodNotes,
      input.drinks,
      input.openTo,
      input.published,
    ],
  );
  return toEvent(row!);
}

/**
 * Applies a partial edit.
 *
 * Only the keys actually present in `patch` reach the UPDATE, so sending
 * `{published: true}` cannot blank out the description by writing a default
 * over it. `coalesce` would not do: it cannot tell "absent" from "null".
 */
export async function updateEvent(
  id: string,
  patch: Partial<Omit<NetavilleEvent, 'id'>>,
): Promise<NetavilleEvent | null> {
  const columns: Record<keyof Omit<NetavilleEvent, 'id'>, string> = {
    title: 'title',
    description: 'description',
    date: 'date',
    startTime: 'start_time',
    endTime: 'end_time',
    room: 'room',
    category: 'category',
    priceInfo: 'price_info',
    cafeteriaDiscount: 'cafeteria_discount',
    catering: 'catering',
    dietary: 'dietary',
    foodNotes: 'food_notes',
    drinks: 'drinks',
    openTo: 'open_to',
    published: 'published',
    fromRequestId: 'from_request_id',
  };

  const assignments: string[] = [];
  const values: unknown[] = [id];
  for (const [key, column] of Object.entries(columns)) {
    const value = patch[key as keyof typeof columns];
    if (value !== undefined) {
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    }
  }

  if (assignments.length === 0) {
    return eventById(id);
  }

  const row = await queryOne<EventRow>(
    `UPDATE events SET ${assignments.join(', ')} WHERE id = $1 RETURNING *`,
    values,
  );
  return row === null ? null : toEvent(row);
}

/**
 * Deletes an event.
 *
 * Announcement slides built from it go with it (the foreign key cascades),
 * and any playlist that lost a slide is stamped as changed so the TV picks the
 * shorter rotation up on its next poll instead of holding a stale one.
 */
export async function deleteEvent(id: string): Promise<NetavilleEvent | null> {
  return transaction(async client => {
    const {rows: affected} = await client.query<{playlist_id: string}>(
      'SELECT DISTINCT playlist_id FROM slides WHERE event_id = $1',
      [id],
    );

    const {rows} = await client.query<EventRow>(
      'DELETE FROM events WHERE id = $1 RETURNING *',
      [id],
    );
    if (rows.length === 0) {
      return null;
    }

    if (affected.length > 0) {
      await client.query(
        'UPDATE playlists SET updated_at = now() WHERE id = ANY($1::text[])',
        [affected.map(row => row.playlist_id)],
      );
    }

    const removed = toEvent(rows[0]!);
    await logActivity('event', `Deleted “${removed.title}”`, client);
    return removed;
  });
}

/* ----------------------------------------------------------------- rsvps -- */

export type RsvpCounts = {going: number; maybe: number};

/** Tallies for every event at once, so a feed of N events is still one query. */
export async function rsvpTallies(): Promise<Map<string, RsvpCounts>> {
  const rows = await query<{event_id: string; going: string; maybe: string}>(
    `SELECT event_id,
            count(*) FILTER (WHERE state = 'going')::text AS going,
            count(*) FILTER (WHERE state = 'maybe')::text AS maybe
     FROM rsvps GROUP BY event_id`,
  );
  return new Map(
    rows.map(row => [
      row.event_id,
      {going: Number(row.going), maybe: Number(row.maybe)},
    ]),
  );
}

/** Which of these events this student said they are going to. */
export async function goingEventIds(userId: string): Promise<Set<string>> {
  const rows = await query<{event_id: string}>(
    "SELECT event_id FROM rsvps WHERE user_id = $1 AND state = 'going'",
    [userId],
  );
  return new Set(rows.map(row => row.event_id));
}

/**
 * Sets one student's answer to one event, and keeps their answer counter in
 * step. Returns whether the answer actually changed.
 *
 * The counter tracks answers, not taps, so a double-tap or a retry of the same
 * value must not move it — which is why the write reports what it did rather
 * than the caller assuming.
 */
export async function setRsvp(
  eventId: string,
  userId: string,
  going: boolean,
): Promise<boolean> {
  return transaction(async client => {
    const {rows: before} = await client.query<{state: string}>(
      'SELECT state FROM rsvps WHERE event_id = $1 AND user_id = $2',
      [eventId, userId],
    );
    const wasGoing = before[0]?.state === 'going';

    if (going) {
      await client.query(
        `INSERT INTO rsvps (event_id, user_id, state, at)
         VALUES ($1, $2, 'going', now())
         ON CONFLICT (event_id, user_id)
         DO UPDATE SET state = 'going', at = now()`,
        [eventId, userId],
      );
    } else {
      await client.query(
        'DELETE FROM rsvps WHERE event_id = $1 AND user_id = $2',
        [eventId, userId],
      );
    }

    if (wasGoing === going) {
      return false;
    }
    await client.query(
      `UPDATE users SET rsvps = greatest(0, rsvps + $2) WHERE id = $1`,
      [userId, going ? 1 : -1],
    );
    return true;
  });
}

/* --------------------------------------------------------------- screens -- */

export async function listScreens(): Promise<Screen[]> {
  const rows = await query<ScreenRow>(
    `SELECT ${SCREEN_COLUMNS} FROM screens ORDER BY name`,
  );
  return rows.map(toScreen);
}

export async function screenById(id: string): Promise<Screen | null> {
  const row = await queryOne<ScreenRow>(
    `SELECT ${SCREEN_COLUMNS} FROM screens WHERE id = $1`,
    [id],
  );
  return row === null ? null : toScreen(row);
}

export async function countScreens(): Promise<{
  paired: number;
  playing: number;
}> {
  const row = await queryOne<{paired: string; playing: string}>(
    `SELECT count(*)::text AS paired,
            count(*) FILTER (
              WHERE active_playlist_id IS NOT NULL
                AND last_seen > now() - ${SCREEN_ONLINE}
            )::text AS playing
     FROM screens WHERE paired`,
  );
  return {paired: Number(row?.paired ?? 0), playing: Number(row?.playing ?? 0)};
}

/** Marks a screen as just-seen. Polling its feed is what keeps it online. */
export async function touchScreen(id: string): Promise<Screen | null> {
  const row = await queryOne<ScreenRow>(
    `UPDATE screens SET last_seen = now() WHERE id = $1
     RETURNING ${SCREEN_COLUMNS}`,
    [id],
  );
  return row === null ? null : toScreen(row);
}

/** Six digits, avoiding one already in use. */
export async function newPairingCode(): Promise<string> {
  const rows = await query<{pairing_code: string}>(
    'SELECT pairing_code FROM screens',
  );
  const taken = new Set(rows.map(row => row.pairing_code));
  let code = '';
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (taken.has(code));
  return code;
}

export async function createScreen(input: {
  name: string;
  location: string;
  pairingCode: string;
}): Promise<Screen> {
  const row = await queryOne<ScreenRow>(
    `INSERT INTO screens (id, name, location, pairing_code, last_seen)
     VALUES ($1, $2, $3, $4, 'epoch')
     RETURNING ${SCREEN_COLUMNS}`,
    [newId('s'), input.name, input.location, input.pairingCode],
  );
  return toScreen(row!);
}

export async function updateScreen(
  id: string,
  patch: {
    name?: string;
    location?: string;
    theme?: ScreenTheme;
    unpair?: boolean;
  },
): Promise<Screen | null> {
  const assignments: string[] = [];
  const values: unknown[] = [id];
  if (patch.name !== undefined) {
    values.push(patch.name);
    assignments.push(`name = $${values.length}`);
  }
  if (patch.location !== undefined) {
    values.push(patch.location);
    assignments.push(`location = $${values.length}`);
  }
  if (patch.theme !== undefined) {
    values.push(patch.theme);
    assignments.push(`theme = $${values.length}`);
  }
  if (patch.unpair === true) {
    // Unpairing also stands the screen down: it must not keep playing a
    // playlist for a wall the panel no longer claims.
    assignments.push('paired = false', 'active_playlist_id = NULL');
  }
  if (assignments.length === 0) {
    return screenById(id);
  }

  const row = await queryOne<ScreenRow>(
    `UPDATE screens SET ${assignments.join(', ')} WHERE id = $1
     RETURNING ${SCREEN_COLUMNS}`,
    values,
  );
  return row === null ? null : toScreen(row);
}

/** Claims a screen by the code it is displaying. */
export async function pairScreen(
  code: string,
): Promise<{screen: Screen} | {error: 'unknown' | 'already'}> {
  const existing = await queryOne<ScreenRow>(
    `SELECT ${SCREEN_COLUMNS} FROM screens WHERE pairing_code = $1`,
    [code],
  );
  if (existing === null) {
    return {error: 'unknown'};
  }
  if (existing.paired) {
    return {error: 'already'};
  }
  const row = await queryOne<ScreenRow>(
    `UPDATE screens SET paired = true WHERE id = $1 RETURNING ${SCREEN_COLUMNS}`,
    [existing.id],
  );
  return {screen: toScreen(row!)};
}

export async function deleteScreen(id: string): Promise<Screen | null> {
  // Its playlists and their slides go with it, by cascade.
  const row = await queryOne<ScreenRow>(
    `DELETE FROM screens WHERE id = $1 RETURNING ${SCREEN_COLUMNS}`,
    [id],
  );
  return row === null ? null : toScreen(row);
}

/* ------------------------------------------------------------- playlists -- */

/**
 * Loads playlists with their slides in running order.
 *
 * Two queries rather than one per playlist: the slides come back in a single
 * pass and are bucketed here, so a screen with ten playlists still costs two
 * round trips.
 */
async function loadPlaylists(
  where: string,
  values: unknown[],
): Promise<Playlist[]> {
  const rows = await query<PlaylistRow>(
    `SELECT * FROM playlists ${where} ORDER BY name`,
    values,
  );
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map(row => row.id);
  const slideRows = await query<SlideRow>(
    `SELECT * FROM slides WHERE playlist_id = ANY($1::text[])
     ORDER BY playlist_id, position`,
    [ids],
  );

  const byPlaylist = new Map<string, Slide[]>(ids.map(id => [id, []]));
  for (const row of slideRows) {
    byPlaylist.get(row.playlist_id)!.push(toSlide(row));
  }

  return rows.map(row => ({
    id: row.id,
    screenId: row.screen_id,
    name: row.name,
    slides: byPlaylist.get(row.id) ?? [],
    active: row.active,
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function listPlaylists(screenId?: string): Promise<Playlist[]> {
  return screenId === undefined
    ? loadPlaylists('', [])
    : loadPlaylists('WHERE screen_id = $1', [screenId]);
}

export async function playlistById(id: string): Promise<Playlist | null> {
  const [playlist] = await loadPlaylists('WHERE id = $1', [id]);
  return playlist ?? null;
}

/** The playlist a screen is currently playing, if it has one and it is active. */
export async function activePlaylistFor(
  screenId: string,
): Promise<Playlist | null> {
  const [playlist] = await loadPlaylists(
    `WHERE active
       AND id = (SELECT active_playlist_id FROM screens WHERE id = $1)`,
    [screenId],
  );
  return playlist ?? null;
}

export async function createPlaylist(
  screenId: string,
  name: string,
): Promise<Playlist> {
  const row = await queryOne<PlaylistRow>(
    `INSERT INTO playlists (id, screen_id, name) VALUES ($1, $2, $3)
     RETURNING *`,
    [newId('p'), screenId, name],
  );
  return {
    id: row!.id,
    screenId: row!.screen_id,
    name: row!.name,
    slides: [],
    active: row!.active,
    updatedAt: row!.updated_at.toISOString(),
  };
}

/**
 * Renames a playlist, replaces its slides, and optionally pushes it to the TV.
 *
 * The slides arrive as a whole array because that is what the editor holds, so
 * they are written the same way: delete, then re-insert in order. Doing it
 * inside the transaction means the TV can never poll mid-rewrite and find a
 * half-empty rotation.
 */
export async function updatePlaylist(
  id: string,
  patch: {name?: string; slides?: Slide[]; publish?: boolean},
): Promise<Playlist | null | {error: 'noScreen'}> {
  type Outcome = {kind: 'ok'} | {kind: 'missing'} | {kind: 'noScreen'};

  const result = await transaction<Outcome>(async client => {
    const {rows} = await client.query<PlaylistRow>(
      'SELECT * FROM playlists WHERE id = $1 FOR UPDATE',
      [id],
    );
    if (rows.length === 0) {
      return {kind: 'missing'};
    }
    const current = rows[0]!;

    if (patch.name !== undefined) {
      await client.query('UPDATE playlists SET name = $2 WHERE id = $1', [
        id,
        patch.name,
      ]);
    }

    if (patch.slides !== undefined) {
      await client.query('DELETE FROM slides WHERE playlist_id = $1', [id]);
      for (const [position, slide] of patch.slides.entries()) {
        await client.query(
          `INSERT INTO slides
             (id, playlist_id, position, type, image_url, event_id, headline,
              cta, event_limit, duration_sec, enabled, start_at, end_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            slide.id,
            id,
            position,
            slide.type,
            slide.imageUrl ?? null,
            slide.eventId ?? null,
            slide.headline ?? null,
            slide.cta ?? null,
            slide.eventLimit ?? 5,
            slide.durationSec,
            slide.enabled,
            slide.startAt ?? null,
            slide.endAt ?? null,
          ],
        );
      }
    }

    if (patch.publish === true) {
      const {rows: screens} = await client.query<{name: string}>(
        'SELECT name FROM screens WHERE id = $1',
        [current.screen_id],
      );
      if (screens.length === 0) {
        return {kind: 'noScreen'};
      }
      // Only one playlist plays per screen, so stand the others down.
      await client.query(
        'UPDATE playlists SET active = (id = $2) WHERE screen_id = $1',
        [current.screen_id, id],
      );
      await client.query(
        'UPDATE screens SET active_playlist_id = $2 WHERE id = $1',
        [current.screen_id, id],
      );
      await logActivity(
        'screen',
        `Pushed “${patch.name ?? current.name}” to ${screens[0]!.name}`,
        client,
      );
    }

    await client.query(
      'UPDATE playlists SET updated_at = now() WHERE id = $1',
      [id],
    );
    return {kind: 'ok'};
  });

  if (result.kind === 'missing') {
    return null;
  }
  if (result.kind === 'noScreen') {
    return {error: 'noScreen'};
  }
  return playlistById(id);
}

export async function deletePlaylist(id: string): Promise<Playlist | null> {
  // The screen's active_playlist_id is cleared by the foreign key's SET NULL,
  // and the slides go by cascade.
  const playlist = await playlistById(id);
  if (playlist === null) {
    return null;
  }
  await query('DELETE FROM playlists WHERE id = $1', [id]);
  return playlist;
}

/* --------------------------------------------------------------- loyalty -- */

type CardRow = {
  user_id: string;
  stamps: number;
  lifetime_stamps: number;
  rewards: number;
  coffees_redeemed: number;
  updated_at: Date;
};

function toCard(row: CardRow): StampCard {
  return {
    userId: row.user_id,
    stamps: row.stamps,
    lifetimeStamps: row.lifetime_stamps,
    rewards: row.rewards,
    coffeesRedeemed: row.coffees_redeemed,
    updatedAt: row.updated_at.toISOString(),
  };
}

type StampEventRow = {
  id: string;
  user_id: string;
  kind: StampEventKind;
  delta: number;
  actor: string | null;
  note: string;
  at: Date;
};

function toStampEvent(row: StampEventRow): StampEvent {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    delta: row.delta,
    actor: row.actor,
    note: row.note,
    at: row.at.toISOString(),
  };
}

/**
 * A student's card, created on first sight.
 *
 * Every student has a card the moment anyone asks about one, so no caller ever
 * has to decide whether to create it. `ON CONFLICT DO NOTHING` rather than a
 * read-then-insert: two tills scanning the same new student at once would both
 * pass the read.
 */
export async function cardFor(
  userId: string,
  client?: PoolClient,
): Promise<StampCard> {
  const run = async (text: string, params: unknown[]) =>
    client ? (await client.query(text, params)).rows : query(text, params);

  await run(
    'INSERT INTO stamp_cards (user_id) VALUES ($1) ON CONFLICT DO NOTHING',
    [userId],
  );
  const rows = (await run('SELECT * FROM stamp_cards WHERE user_id = $1', [
    userId,
  ])) as CardRow[];
  return toCard(rows[0]!);
}

export async function cardHistory(
  userId: string,
  limit = 12,
): Promise<StampEvent[]> {
  const rows = await query<StampEventRow>(
    `SELECT e.id, e.user_id, e.kind, e.delta, e.note, e.at, u.name AS actor
     FROM stamp_events e
     LEFT JOIN users u ON u.id = e.actor_id
     WHERE e.user_id = $1
     ORDER BY e.at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return rows.map(toStampEvent);
}

async function writeCard(
  client: PoolClient,
  card: StampCard,
): Promise<StampCard> {
  const {rows} = await client.query<CardRow>(
    `UPDATE stamp_cards
     SET stamps = $2, lifetime_stamps = $3, rewards = $4,
         coffees_redeemed = $5, updated_at = now()
     WHERE user_id = $1
     RETURNING *`,
    [
      card.userId,
      card.stamps,
      card.lifetimeStamps,
      card.rewards,
      card.coffeesRedeemed,
    ],
  );
  return toCard(rows[0]!);
}

async function logStamp(
  client: PoolClient,
  entry: {
    userId: string;
    kind: StampEventKind;
    delta: number;
    actorId: string | null;
    note?: string;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO stamp_events (id, user_id, kind, delta, actor_id, note)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      newId('se'),
      entry.userId,
      entry.kind,
      entry.delta,
      entry.actorId,
      entry.note ?? '',
    ],
  );
}

export type StampOutcome = {
  card: StampCard;
  /** True when this stamp filled the card and banked a free coffee. */
  earnedReward: boolean;
};

/**
 * Adds one stamp, converting a full card into a banked reward.
 *
 * `FOR UPDATE` because two tills can scan the same student at the same moment;
 * without the lock both would read nine and both write ten, and one coffee
 * would go missing.
 */
export async function addStamp(
  userId: string,
  actorId: string | null,
): Promise<StampOutcome> {
  return transaction(async client => {
    await cardFor(userId, client);
    const {rows} = await client.query<CardRow>(
      'SELECT * FROM stamp_cards WHERE user_id = $1 FOR UPDATE',
      [userId],
    );
    const current = toCard(rows[0]!);

    const filled = current.stamps + 1 >= STAMPS_PER_REWARD;
    const next: StampCard = {
      ...current,
      stamps: filled ? 0 : current.stamps + 1,
      lifetimeStamps: current.lifetimeStamps + 1,
      rewards: filled ? current.rewards + 1 : current.rewards,
    };

    const card = await writeCard(client, next);
    await logStamp(client, {userId, kind: 'stamp', delta: 1, actorId});
    if (filled) {
      await logStamp(client, {
        userId,
        kind: 'reward',
        delta: 0,
        actorId,
        note: 'Card full — free coffee banked',
      });
    }
    return {card, earnedReward: filled};
  });
}

/**
 * Takes a stamp back, for a mis-scan at the counter.
 *
 * The exact inverse of adding one, including stepping back across a reward
 * boundary: a stamp given by mistake that happened to fill the card must not
 * leave a free coffee behind when it is undone.
 */
export async function removeStamp(
  userId: string,
  actorId: string | null,
): Promise<StampCard> {
  return transaction(async client => {
    await cardFor(userId, client);
    const {rows} = await client.query<CardRow>(
      'SELECT * FROM stamp_cards WHERE user_id = $1 FOR UPDATE',
      [userId],
    );
    const current = toCard(rows[0]!);

    if (current.stamps === 0 && current.rewards === 0) {
      return current;
    }

    const acrossBoundary = current.stamps === 0;
    const next: StampCard = {
      ...current,
      stamps: acrossBoundary ? STAMPS_PER_REWARD - 1 : current.stamps - 1,
      rewards: acrossBoundary ? current.rewards - 1 : current.rewards,
      lifetimeStamps: Math.max(0, current.lifetimeStamps - 1),
    };

    const card = await writeCard(client, next);
    await logStamp(client, {
      userId,
      kind: 'unstamp',
      delta: -1,
      actorId,
      note: acrossBoundary ? 'Reversed across a full card' : '',
    });
    return card;
  });
}

/** Hands over a banked free coffee. */
export async function redeemReward(
  userId: string,
  actorId: string | null,
): Promise<StampCard | {error: 'noRewards'}> {
  return transaction(async client => {
    await cardFor(userId, client);
    const {rows} = await client.query<CardRow>(
      'SELECT * FROM stamp_cards WHERE user_id = $1 FOR UPDATE',
      [userId],
    );
    const current = toCard(rows[0]!);
    if (current.rewards === 0) {
      return {error: 'noRewards' as const};
    }

    const card = await writeCard(client, {
      ...current,
      rewards: current.rewards - 1,
      coffeesRedeemed: current.coffeesRedeemed + 1,
    });
    await logStamp(client, {
      userId,
      kind: 'redeem',
      delta: 0,
      actorId,
      note: 'Free coffee handed over',
    });
    return card;
  });
}

export type LeaderboardRow = {
  userId: string;
  displayName: string;
  lifetimeStamps: number;
  /** Stamps earned since the first of this month, from the ledger. */
  monthStamps: number;
};

/**
 * The ranks table.
 *
 * The month column is summed from the ledger rather than kept as a second
 * counter, because a counter would need resetting at midnight on the first —
 * a job that has to run, and silently wrongs everyone the month it does not.
 */
export async function leaderboard(limit = 50): Promise<LeaderboardRow[]> {
  const rows = await query<{
    user_id: string;
    display_name: string;
    lifetime_stamps: number;
    month_stamps: string;
  }>(
    `SELECT c.user_id,
            u.name AS display_name,
            c.lifetime_stamps,
            coalesce(sum(e.delta) FILTER (
              WHERE e.at >= date_trunc('month', now())
            ), 0)::text AS month_stamps
     FROM stamp_cards c
     JOIN users u ON u.id = c.user_id
     LEFT JOIN stamp_events e ON e.user_id = c.user_id
     WHERE u.role = 'student' AND u.active
     GROUP BY c.user_id, u.name, c.lifetime_stamps
     ORDER BY c.lifetime_stamps DESC, u.name
     LIMIT $1`,
    [limit],
  );
  return rows.map(row => ({
    userId: row.user_id,
    displayName: row.display_name,
    lifetimeStamps: row.lifetime_stamps,
    monthStamps: Number(row.month_stamps),
  }));
}

/** Today's counter activity, for the header on the scan screen. */
export async function stampsToday(): Promise<{
  stamps: number;
  redeemed: number;
}> {
  const row = await queryOne<{stamps: string; redeemed: string}>(
    `SELECT count(*) FILTER (WHERE kind = 'stamp')::text  AS stamps,
            count(*) FILTER (WHERE kind = 'redeem')::text AS redeemed
     FROM stamp_events
     WHERE at >= date_trunc('day', now())`,
  );
  return {
    stamps: Number(row?.stamps ?? 0),
    redeemed: Number(row?.redeemed ?? 0),
  };
}
