-- Netaville schema.
--
-- Mirrors lib/types.ts one table per exported type. Written for plain
-- Postgres so the same file applies to a local container and to Neon: no
-- extensions, no superuser-only statements, no vendor syntax.
--
-- Ids stay TEXT rather than uuid/serial because the app already mints its own
-- ('u-admin', 'e-3', newId('a')) and those values are baked into the seed data
-- and into the mobile app's fixtures.

BEGIN;

DROP TABLE IF EXISTS canva_connection CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS email_verifications CASCADE;
DROP TABLE IF EXISTS activity CASCADE;
DROP TABLE IF EXISTS stamp_events CASCADE;
DROP TABLE IF EXISTS stamp_cards CASCADE;
DROP TABLE IF EXISTS slides CASCADE;
DROP TABLE IF EXISTS request_dates CASCADE;
DROP TABLE IF EXISTS playlists CASCADE;
DROP TABLE IF EXISTS screens CASCADE;
DROP TABLE IF EXISTS rsvps CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS event_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id              TEXT PRIMARY KEY,
  name            TEXT        NOT NULL,
  -- Sign-in is by email, and it is compared case-insensitively in lib/auth.ts,
  -- so the uniqueness index has to fold case too or two accounts could differ
  -- only by capitalisation and both match the same login.
  email           TEXT        NOT NULL,
  -- 'student' is a verified UKIM account (Microsoft sign-in, ukim.mk address);
  -- 'member' is everyone else, who signs up with an email and a password;
  -- 'admin' runs this panel. Only members carry a password_hash — a student's
  -- credential lives with Microsoft, and the dev admin password is a constant
  -- in lib/auth.ts.
  role            TEXT        NOT NULL CHECK (role IN ('student', 'admin', 'member')),
  -- scrypt hash from lib/password.ts, self-describing (params + salt + digest).
  -- Required for a member, absent for a student or an admin.
  password_hash   TEXT,
  -- There is no stored `online`. Presence is derived from last_seen at read
  -- time (see lib/store.ts), because a stored flag is only ever correct until
  -- the process that set it stops running — a crash would leave everyone
  -- online forever.
  last_seen       TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at       DATE        NOT NULL,
  events_attended INTEGER     NOT NULL DEFAULT 0 CHECK (events_attended >= 0),
  rsvps           INTEGER     NOT NULL DEFAULT 0 CHECK (rsvps >= 0),
  active          BOOLEAN     NOT NULL DEFAULT TRUE,
  CHECK (role <> 'member' OR password_hash IS NOT NULL)
);

CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

CREATE TABLE event_requests (
  id                    TEXT PRIMARY KEY,
  title                 TEXT        NOT NULL,
  description           TEXT        NOT NULL DEFAULT '',
  requester_id          TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- What kind of event the organiser says it is. The admin can override it on
  -- approval, so this is a proposal rather than the final category.
  category              TEXT        NOT NULL DEFAULT 'Community' CHECK (category IN
                          ('Workshop', 'Social', 'Talk', 'Quiz', 'Community', 'Private')),
  room                  TEXT        NOT NULL,
  catering              TEXT        NOT NULL DEFAULT '',
  -- Dietary requirements for the group, set by the organiser. An array rather
  -- than a row per requirement: it is a short fixed vocabulary that is always
  -- read as a whole, never joined or counted across requests.
  dietary               TEXT[]      NOT NULL DEFAULT '{}',
  food_notes            TEXT        NOT NULL DEFAULT '',
  expected_participants INTEGER     NOT NULL CHECK (expected_participants >= 0),
  status                TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
  -- Which of the proposed slots the admin picked. Set on approval, and the
  -- foreign key is added after request_dates exists.
  chosen_date_id        TEXT,
  -- Only set on rejection; the app shows it back to the student.
  reason                TEXT,
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'rejected' OR reason IS NOT NULL),
  CHECK (status <> 'approved' OR chosen_date_id IS NOT NULL)
);

CREATE INDEX event_requests_status_idx ON event_requests (status, submitted_at DESC);
CREATE INDEX event_requests_requester_idx ON event_requests (requester_id);

/*
 * The slots an organiser proposed.
 *
 * A request carries several because the constraint is nearly always the room
 * rather than the date — offering three workable times up front turns a
 * rejection-and-resubmit into a single decision. The admin picks one on
 * approval and that slot becomes the published event.
 */
CREATE TABLE request_dates (
  id         TEXT    PRIMARY KEY,
  request_id TEXT    NOT NULL REFERENCES event_requests (id) ON DELETE CASCADE,
  position   INTEGER NOT NULL CHECK (position >= 0),
  date       DATE    NOT NULL,
  start_time TIME    NOT NULL,
  end_time   TIME    NOT NULL,
  UNIQUE (request_id, position) DEFERRABLE INITIALLY DEFERRED,
  CHECK (end_time > start_time)
);

CREATE INDEX request_dates_request_idx ON request_dates (request_id, position);

ALTER TABLE event_requests
  ADD CONSTRAINT event_requests_chosen_date_fkey
  FOREIGN KEY (chosen_date_id) REFERENCES request_dates (id) ON DELETE SET NULL;

CREATE TABLE events (
  id                 TEXT PRIMARY KEY,
  title              TEXT    NOT NULL,
  description        TEXT    NOT NULL DEFAULT '',
  date               DATE    NOT NULL,
  start_time         TIME    NOT NULL,
  end_time           TIME    NOT NULL,
  room               TEXT    NOT NULL,
  category           TEXT    NOT NULL CHECK (category IN
                       ('Workshop', 'Social', 'Talk', 'Quiz', 'Community', 'Private')),
  price_info         TEXT    NOT NULL DEFAULT 'Free',
  cafeteria_discount INTEGER NOT NULL DEFAULT 0
                       CHECK (cafeteria_discount BETWEEN 0 AND 100),
  catering           TEXT    NOT NULL DEFAULT '',
  -- Carried through from the request so the kitchen reads it off the event.
  dietary            TEXT[]  NOT NULL DEFAULT '{}',
  food_notes         TEXT    NOT NULL DEFAULT '',
  drinks             BOOLEAN NOT NULL DEFAULT FALSE,
  open_to            TEXT    NOT NULL DEFAULT 'Open to all',
  published          BOOLEAN NOT NULL DEFAULT FALSE,
  -- Set when the event was created by approving a request. The request is kept
  -- even if the event is deleted, hence SET NULL rather than CASCADE.
  from_request_id    TEXT REFERENCES event_requests (id) ON DELETE SET NULL,
  CHECK (end_time > start_time)
);

-- The app's calendar and the TV feed both read "published events by day".
CREATE INDEX events_published_date_idx ON events (published, date);

CREATE TABLE rsvps (
  event_id TEXT        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  user_id  TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- 'none' is absence of a row, matching the Rsvp type in lib/types.ts.
  state    TEXT        NOT NULL CHECK (state IN ('going', 'maybe')),
  at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX rsvps_user_idx ON rsvps (user_id);

CREATE TABLE screens (
  id                 TEXT PRIMARY KEY,
  name               TEXT        NOT NULL,
  location           TEXT        NOT NULL DEFAULT '',
  -- Six digits the TV shows until an admin claims it.
  pairing_code       TEXT        NOT NULL UNIQUE CHECK (pairing_code ~ '^[0-9]{6}$'),
  paired             BOOLEAN     NOT NULL DEFAULT FALSE,
  /*
   * How the wall renders. A cafeteria under daylight needs the light theme to
   * stay readable; a dark foyer needs the dark one. 'auto' switches at dusk,
   * which also stops a bright static layout sitting on the same panel all
   * night — the thing that burns a TV in.
   */
  theme              TEXT        NOT NULL DEFAULT 'auto'
                       CHECK (theme IN ('light', 'dark', 'auto')),
  -- Derived like users.online: a screen is online while it has polled its feed
  -- recently, which is a fact about last_seen and nothing else.
  last_seen          TIMESTAMPTZ NOT NULL DEFAULT now(),
  /*
   * The credential the physical device holds.
   *
   * A TV opens one fixed URL (/tv), the server hands it a random token, and
   * every feed poll after that carries it. SHA-256 only, like refresh_tokens —
   * the device keeps the plaintext in its own storage, the database keeps
   * nothing usable. NULL for a screen created before this existed or seeded by
   * hand: those still work through the legacy /screen/[id] URL, they just have
   * no device of their own yet.
   */
  device_token_hash  TEXT UNIQUE,
  enrolled_at        TIMESTAMPTZ,
  /*
   * What the device last told us about itself — user agent, viewport, the slide
   * on screen, playback errors. Diagnostics only, shown in the panel; never a
   * security input.
   */
  device_info        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  -- Which playlist the TV is currently showing. The FK is added after
  -- playlists exists, since the two tables point at each other.
  active_playlist_id TEXT
);

CREATE TABLE playlists (
  id         TEXT PRIMARY KEY,
  screen_id  TEXT        NOT NULL REFERENCES screens (id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  -- True once an admin has pushed it to the TV.
  active     BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX playlists_screen_idx ON playlists (screen_id);

ALTER TABLE screens
  ADD CONSTRAINT screens_active_playlist_fkey
  FOREIGN KEY (active_playlist_id) REFERENCES playlists (id) ON DELETE SET NULL;

-- Slides are a nested array on Playlist in TypeScript; in SQL they are a child
-- table with an explicit position, because array order is the running order on
-- the TV and has to survive a round trip.
CREATE TABLE slides (
  id           TEXT PRIMARY KEY,
  playlist_id  TEXT    NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
  position     INTEGER NOT NULL CHECK (position >= 0),
  /*
   * 'upcoming' is the events board: it draws the next few published events
   * rather than fixed artwork, so a rotation is built by interleaving it with
   * commercials — board, advert, board, advert — and the board is always
   * current without anyone re-cutting a slide.
   */
  type         TEXT    NOT NULL CHECK (type IN
                 ('poster', 'announcement', 'marketing', 'upcoming')),
  -- 'upcoming' only: how many events the board shows at once.
  event_limit  INTEGER NOT NULL DEFAULT 5 CHECK (event_limit BETWEEN 1 AND 12),
  -- poster + marketing render artwork — a still (image_url) or a loop
  -- (video_url, an .mp4). announcement renders an event instead.
  image_url    TEXT,
  video_url    TEXT,
  event_id     TEXT REFERENCES events (id) ON DELETE CASCADE,
  headline     TEXT,
  cta          TEXT,
  -- The Canva design this slide's artwork is edited in, if it was made there.
  -- Kept so "open in Canva" and "pull the latest export" keep working across
  -- saves. See lib/canva.ts.
  canva_design_id TEXT,
  duration_sec INTEGER NOT NULL DEFAULT 10 CHECK (duration_sec > 0),
  enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  -- Optional window. Outside it the slide is skipped.
  start_at     TIMESTAMPTZ,
  end_at       TIMESTAMPTZ,
  -- Reordering a playlist rewrites several positions at once and will pass
  -- through a colliding intermediate state, so the check is deferred to COMMIT.
  UNIQUE (playlist_id, position) DEFERRABLE INITIALLY DEFERRED,
  CHECK (type <> 'announcement' OR event_id IS NOT NULL),
  -- A poster needs artwork of some kind; the rest are drawn from text and data.
  CHECK (type <> 'poster' OR image_url IS NOT NULL OR video_url IS NOT NULL),
  CHECK (start_at IS NULL OR end_at IS NULL OR end_at > start_at)
);

/*
 * One loyalty card per student.
 *
 * The running totals live here rather than being summed from stamp_events on
 * every read: the card is drawn on the phone, on the counter screen and in the
 * ranks table, and a full-ledger sum on each of those is work that never pays
 * for itself. The ledger below is the audit trail, not the source of the
 * number — the two are kept in step inside one transaction.
 */
CREATE TABLE stamp_cards (
  user_id          TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  -- Stamps on the current card. Reaching STAMPS_PER_REWARD converts to a
  -- reward and resets, so this never reaches the limit at rest.
  stamps           INTEGER     NOT NULL DEFAULT 0 CHECK (stamps >= 0),
  lifetime_stamps  INTEGER     NOT NULL DEFAULT 0 CHECK (lifetime_stamps >= 0),
  -- Free coffees banked and not yet drunk.
  rewards          INTEGER     NOT NULL DEFAULT 0 CHECK (rewards >= 0),
  coffees_redeemed INTEGER     NOT NULL DEFAULT 0 CHECK (coffees_redeemed >= 0),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX stamp_cards_lifetime_idx ON stamp_cards (lifetime_stamps DESC);

/*
 * Every change to a card, and who made it.
 *
 * A loyalty scheme is an argument waiting to happen at a counter — "I had nine"
 * — and the only useful answer is a list of what happened and when. It is also
 * how a month's tally is computed for the leaderboard without a second counter
 * to keep in step.
 */
CREATE TABLE stamp_events (
  id       TEXT PRIMARY KEY,
  user_id  TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind     TEXT        NOT NULL CHECK (kind IN
             ('stamp', 'unstamp', 'reward', 'redeem')),
  /** How the lifetime count moved: +1 a stamp, -1 a correction, 0 otherwise. */
  delta    INTEGER     NOT NULL,
  -- The admin who did it. Kept if the account is later deleted, because the
  -- ledger is the record and a null actor is less useful than a stale id.
  actor_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  note     TEXT        NOT NULL DEFAULT '',
  at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX stamp_events_user_idx ON stamp_events (user_id, at DESC);
CREATE INDEX stamp_events_at_idx ON stamp_events (at DESC);

CREATE TABLE activity (
  id      TEXT PRIMARY KEY,
  kind    TEXT        NOT NULL CHECK (kind IN
            ('request', 'approval', 'rejection', 'event', 'screen', 'auth')),
  message TEXT        NOT NULL,
  at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The dashboard only ever reads the newest entries.
CREATE INDEX activity_at_idx ON activity (at DESC);

/*
 * The panel's link to Canva, for designing TV posters and video ads.
 *
 * One row — the whole staff shares a single Canva workspace connection rather
 * than each admin authorising their own. The id is fixed at 'default' so
 * there is only ever one; an upsert on connect replaces it.
 *
 * Tokens are stored as written by lib/canva.ts: AES-GCM if CANVA_TOKEN_KEY is
 * set, plain text otherwise (the same dev-grade posture as ADMIN_DEV_PASSWORD
 * in lib/auth.ts — a real deployment sets the key).
 */
CREATE TABLE canva_connection (
  id            TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  access_token  TEXT        NOT NULL,
  refresh_token TEXT        NOT NULL,
  -- When the access token stops working; lib/canva.ts refreshes ahead of this.
  expires_at    TIMESTAMPTZ NOT NULL,
  -- The admin who linked the account, for the "connected by" line in the UI.
  connected_by  TEXT        NOT NULL,
  connected_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

/*
 * Refresh tokens for the mobile app.
 *
 * The app holds a short-lived access token (a signed JWT, minutes) and a
 * long-lived refresh token (this table, months). Only the refresh token is
 * stored server-side, and only as a SHA-256 digest: a database leak then hands
 * an attacker no usable credential, the same reasoning as password_hash.
 *
 * Rotation with reuse detection. Every refresh mints a new token and marks the
 * old one used; the whole chain shares a `family`. If a token that was already
 * used comes back, either the app replayed it or someone stole it — and the
 * server cannot tell which, so it revokes the entire family. The legitimate
 * device is signed out and has to authenticate again, which is the correct
 * outcome when a refresh token may be in someone else's hands.
 */
CREATE TABLE refresh_tokens (
  -- SHA-256 of the token the app holds, hex. The token itself is never stored.
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- One rotation chain, from a single sign-in. Revoking a family signs that
  -- one device out without touching the user's other devices.
  family      TEXT        NOT NULL,
  -- Set the moment the token is exchanged. A second presentation of a row that
  -- already has this is the reuse signal described above.
  used_at     TIMESTAMPTZ,
  -- Set when the family is revoked, by logout or by reuse detection.
  revoked_at  TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Rough provenance, shown to the user as "signed in on …". Not a security
  -- control: it is client-supplied and only ever displayed.
  device_label TEXT       NOT NULL DEFAULT 'A device'
);

CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_family_idx ON refresh_tokens (family);
-- Sweeping expired rows is a range scan over this.
CREATE INDEX refresh_tokens_expires_idx ON refresh_tokens (expires_at);

/*
 * Pending email verifications.
 *
 * Registration no longer creates an account. It parks the details here, sends a
 * six-digit code to the address, and only mints the `users` row once the code
 * comes back. That is what stands in for the Microsoft sign-in that used to
 * prove a student held their ukim.mk mailbox: a `student` role is granted by
 * the address, and the address is only trusted once mail sent to it is
 * answered.
 *
 * One row per address — a re-registration replaces it. The password is already
 * scrypt-hashed before it lands here (the plain text never reaches this table),
 * and the code is stored only as its SHA-256, so a leak of this table yields
 * neither a password nor a usable code.
 *
 * Short-lived and attempt-capped: fifteen minutes, five wrong guesses, then the
 * row is gone and the person starts over. Six digits over that window with a
 * rate-limited endpoint is not worth brute-forcing.
 */
CREATE TABLE email_verifications (
  -- Always stored lowercased; this is the natural key and a re-register upserts.
  email         TEXT PRIMARY KEY,
  -- SHA-256 of the six-digit code, hex.
  code_hash     TEXT        NOT NULL,
  -- The account to create once the code is confirmed.
  name          TEXT        NOT NULL,
  password_hash TEXT        NOT NULL,
  -- Wrong guesses so far. At the cap the row is deleted on the next attempt.
  attempts      INTEGER     NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sweeping expired rows is a range scan over this.
CREATE INDEX email_verifications_expires_idx ON email_verifications (expires_at);

COMMIT;
