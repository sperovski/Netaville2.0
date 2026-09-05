import {
  seedActivity,
  seedEvents,
  seedPlaylists,
  seedRequests,
  seedScreens,
  seedUsers,
} from './seed';
import type {
  Activity,
  ActivityKind,
  EventRequest,
  NetavilleEvent,
  Playlist,
  Screen,
  User,
} from './types';

/**
 * The shared database, in memory.
 *
 * Swap the body of this module for real queries (Postgres, Prisma, …) and
 * every route handler above it keeps working — they only ever touch `db`.
 * It hangs off globalThis so Next's dev hot-reload doesn't reset the data
 * on every file save.
 */
type Database = {
  users: User[];
  requests: EventRequest[];
  events: NetavilleEvent[];
  screens: Screen[];
  playlists: Playlist[];
  activity: Activity[];
};

const globalRef = globalThis as typeof globalThis & {
  __netavilleDb?: Database;
};

export const db: Database = (globalRef.__netavilleDb ??= {
  users: structuredClone(seedUsers),
  requests: structuredClone(seedRequests),
  events: structuredClone(seedEvents),
  screens: structuredClone(seedScreens),
  playlists: structuredClone(seedPlaylists),
  activity: structuredClone(seedActivity),
});

let counter = 0;

/** Ids only have to be unique within a process, so a counter is enough. */
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`;
}

export function logActivity(kind: ActivityKind, message: string): Activity {
  const entry: Activity = {
    id: newId('a'),
    kind,
    message,
    at: new Date().toISOString(),
  };
  db.activity.unshift(entry);
  db.activity = db.activity.slice(0, 40);
  return entry;
}

/** A screen counts as online while it has polled within the last 45 seconds. */
const ONLINE_WINDOW_MS = 45_000;

export function refreshScreenPresence(): void {
  const now = Date.now();
  for (const screen of db.screens) {
    screen.online = now - new Date(screen.lastSeen).getTime() < ONLINE_WINDOW_MS;
  }
}

export function touchScreen(id: string): Screen | undefined {
  const screen = db.screens.find(candidate => candidate.id === id);
  if (screen !== undefined) {
    screen.lastSeen = new Date().toISOString();
    screen.online = true;
  }
  return screen;
}

export function userById(id: string): User | undefined {
  return db.users.find(user => user.id === id);
}

export function activePlaylistFor(screenId: string): Playlist | undefined {
  const screen = db.screens.find(candidate => candidate.id === screenId);
  if (screen?.activePlaylistId == null) {
    return undefined;
  }
  return db.playlists.find(
    playlist => playlist.id === screen.activePlaylistId && playlist.active,
  );
}

/** Six digits, avoiding one already in use. */
export function newPairingCode(): string {
  const taken = new Set(db.screens.map(screen => screen.pairingCode));
  let code = '';
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (taken.has(code));
  return code;
}
