# Netaville Admin

The staff panel for Netaville: event requests, events, students and the TV
signage that runs on screens around the building. Desktop web only — the
layout assumes ≥1024px and does not try to be responsive.

Students never come here. They use the React Native app in `../netaville`.

## Running it

```sh
npm install
npm run dev      # http://localhost:3000
```

Sign in with `stefan.perovski20@gmail.com` / `netaville`.

## Where the data lives

The mobile app currently has **no backend** — its events, stamps and
leaderboard are local mock state. So this panel carries the shared schema and
API instead, and is the natural place for the real database to land:

- `lib/types.ts` — the shared schema (User, EventRequest, Event, Screen,
  Playlist, Slide).
- `lib/store.ts` — an in-memory database seeded from `lib/seed.ts`. Swap the
  body of this module for Postgres/Prisma and every route handler above it
  keeps working; nothing else touches storage.
- `app/api/*` — the HTTP surface. Point the mobile app at
  `GET /api/events` (published only) to replace its local `src/data/events.ts`.

Because the store is in memory, **data resets when the server restarts.**
Uploaded images in `public/uploads/` do survive.

## Auth

`role: 'admin'` is the only thing that gets a session. Students hitting the
login form get the same message as an unknown email, so the panel never
confirms which addresses exist. The role is re-checked on every request, so
demoting an account takes effect immediately rather than when its cookie
expires.

The password check in `lib/auth.ts` is a dev placeholder. Replace
`verifyCredentials` with a call to the real auth server when there is one;
`readSession` becomes a token verification and nothing else changes.

## The TV displays

`/screen/[id]` is what a physical screen opens fullscreen. It is deliberately
unauthenticated — a wall-mounted TV has no keyboard, and the content is public
signage — so the screen id is the only secret.

1. Add a screen in `/displays`. It gets a six-digit pairing code.
2. Open `/screen/<id>` on the TV. It displays that code.
3. Enter the code under **Pair code** to claim it.
4. Build a playlist (poster / event announcement / marketing), then
   **Push to TV**.

The screen polls `/api/screens/[id]/feed` every 10 seconds and restarts its
rotation only when the playlist actually changed, so a routine poll never
interrupts the slide on the wall. Polling is also what marks a screen online:
no poll for 45 seconds and it shows as offline.

Slides that are disabled, or outside their scheduled window, are filtered out
server-side — the TV only ever receives what it should be showing.

## Theme

Every colour is a Tailwind token defined once in `app/globals.css`, matching
`netaville/src/theme.ts`. Use `bg-surface`, `text-ink`, `border-line`,
`text-brand`, `bg-coral` and so on. No component hardcodes a hex value.
