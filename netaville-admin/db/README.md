# Database

Postgres. Local development runs it in Docker; production will be Neon. The
schema file is the same for both — going live is a change of `DATABASE_URL`
and nothing else.

## Local

```sh
npm run db:up      # start Postgres in Docker (port 5432)
npm run db:reset   # apply schema.sql, load the fixtures from lib/seed.ts
npm run db:psql    # open a psql shell
npm run db:down    # stop it (the data volume survives)
```

`db:reset` is destructive: `schema.sql` drops every table before recreating
it. That is the point — the same fixtures always produce the same database.

Connection details live in `.env.local`, which is gitignored. Copy
`.env.example` if you do not have one.

## Moving to Neon

1. Create a project at <https://console.neon.tech> (free tier).
2. Copy the **pooled** connection string from the dashboard. It ends in
   `?sslmode=require`, which is what `lib/db.ts` keys off to enable TLS.
3. Put it in `.env.local` as `DATABASE_URL`, then `npm run db:reset` once to
   create the tables there.
4. For a deployment, set the same `DATABASE_URL` as an environment variable in
   the host (Vercel project settings, and so on) — never in a committed file.

Neon's free tier suspends an idle database, so the first query after a quiet
spell takes a second or two to wake it. `connectionTimeoutMillis` in
`lib/db.ts` allows for that.

## Layout

| File | What it is |
| --- | --- |
| `schema.sql` | Every table, one per exported type in `lib/types.ts`. |
| `seed.ts` | Applies the schema, then loads the fixtures from `lib/seed.ts`. |
| `../lib/db.ts` | The connection pool and the `query` / `transaction` helpers. |

Two notes on the shape:

- **Ids are `TEXT`**, not `uuid` or `serial`, because the app already mints its
  own (`u-admin`, `e-3`, `newId('a')`) and those values are baked into the
  fixtures and the mobile app.
- **Slides are their own table** with an explicit `position`, though they are a
  nested array on `Playlist` in TypeScript. Array order is the running order on
  the TV, so it has to survive a round trip.

- **There is no stored `online` column** on `users` or `screens`. Presence is
  derived from `last_seen` on every read — 5 minutes for a student, 45 seconds
  for a screen. A stored flag has to be cleared by whoever set it, and nothing
  clears it when a phone loses signal or the server restarts; the row would
  just say "online" forever.

## Where the queries live

`lib/store.ts` is the only module that writes SQL. Route handlers and pages
call its functions and never see a query, a row shape or a connection — the
tables are snake_case, the rest of the codebase uses the camelCase types in
`lib/types.ts`, and the mapping happens there once.

Anything that has to be all-or-nothing goes through `transaction()`:

- **Approving a request** flips the request, inserts the published event and
  writes the activity entry together. An approved request with no event is a
  student told yes about something that is not in their feed.
- **Rewriting a playlist's slides** deletes and re-inserts them in one go, so a
  TV polling mid-edit can never catch a half-empty rotation.
- **An RSVP** writes the answer and the student's counter together.

Approve and reject decide pending-ness inside the `UPDATE` itself
(`WHERE ... AND status = 'pending'`) rather than reading first and writing
after. Two admins clicking at the same moment would both pass a read-then-check;
only one can win a conditional update.
