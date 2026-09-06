/**
 * Loads the schema and the seed fixtures into Postgres.
 *
 *   npm run db:reset
 *
 * Destructive by design: schema.sql drops every table before recreating it, so
 * this always produces the same database from the same fixtures. The fixtures
 * are imported from lib/seed.ts rather than duplicated here — that file is
 * still what the in-memory store uses, and two copies would drift.
 */
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {Client} from 'pg';
import {
  seedActivity,
  seedCards,
  seedEvents,
  seedPlaylists,
  seedRequests,
  seedRsvps,
  seedScreens,
  seedUsers,
} from '../lib/seed';

const here = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.length === 0) {
    throw new Error('DATABASE_URL is not set (expected in .env.local).');
  }

  const client = new Client({
    connectionString: url,
    ssl: url.includes('sslmode=require')
      ? {rejectUnauthorized: true}
      : undefined,
  });
  await client.connect();

  try {
    const schema = await readFile(join(here, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('schema applied');

    // One transaction for the whole seed: a half-loaded database is worse
    // than an empty one, because it looks like it worked.
    await client.query('BEGIN');

    for (const user of seedUsers) {
      await client.query(
        // No `online` column: presence is derived from last_seen, and the
        // fixtures already set lastSeen to match the flag they carry.
        `INSERT INTO users
           (id, name, email, role, last_seen, joined_at,
            events_attended, rsvps, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          user.id,
          user.name,
          user.email,
          user.role,
          user.lastSeen,
          user.joinedAt,
          user.eventsAttended,
          user.rsvps,
          user.active,
        ],
      );
    }

    for (const request of seedRequests) {
      // chosen_date_id is set afterwards: the slot it points at does not exist
      // until the request itself does.
      await client.query(
        `INSERT INTO event_requests
           (id, title, description, requester_id, category, room, catering,
            dietary, food_notes, expected_participants, status, reason,
            submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          request.id,
          request.title,
          request.description,
          request.requesterId,
          request.category,
          request.room,
          request.catering,
          request.dietary,
          request.foodNotes,
          request.expectedParticipants,
          // An approved request must name its chosen slot, so it goes in as
          // pending here and is flipped once the slots exist.
          request.status === 'approved' ? 'pending' : request.status,
          request.reason ?? null,
          request.submittedAt,
        ],
      );

      for (const [position, slot] of request.dates.entries()) {
        await client.query(
          `INSERT INTO request_dates
             (id, request_id, position, date, start_time, end_time)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            slot.id,
            request.id,
            position,
            slot.date,
            slot.startTime,
            slot.endTime,
          ],
        );
      }

      if (request.chosenDateId !== undefined) {
        await client.query(
          'UPDATE event_requests SET chosen_date_id = $2, status = $3 WHERE id = $1',
          [request.id, request.chosenDateId, request.status],
        );
      }
    }

    for (const event of seedEvents) {
      await client.query(
        `INSERT INTO events
           (id, title, description, date, start_time, end_time, room, category,
            price_info, cafeteria_discount, catering, dietary, food_notes,
            drinks, open_to, published, from_request_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                 $15, $16, $17)`,
        [
          event.id,
          event.title,
          event.description,
          event.date,
          event.startTime,
          event.endTime,
          event.room,
          event.category,
          event.priceInfo,
          event.cafeteriaDiscount,
          event.catering,
          event.dietary,
          event.foodNotes,
          event.drinks,
          event.openTo,
          event.published,
          event.fromRequestId ?? null,
        ],
      );
    }

    for (const card of seedCards) {
      await client.query(
        `INSERT INTO stamp_cards
           (user_id, stamps, lifetime_stamps, rewards, coffees_redeemed,
            updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          card.userId,
          card.stamps,
          card.lifetimeStamps,
          card.rewards,
          card.coffeesRedeemed,
          card.updatedAt,
        ],
      );

      // A few ledger lines this month, so the ranks table's month column and
      // the card history are not empty on a fresh database.
      const thisMonth = Math.min(6, Math.max(1, card.stamps));
      for (let index = 0; index < thisMonth; index += 1) {
        await client.query(
          `INSERT INTO stamp_events (id, user_id, kind, delta, actor_id, at)
           VALUES ($1, $2, 'stamp', 1, 'u-admin', now() - ($3 || ' hours')::interval)`,
          [`se-${card.userId}-${index}`, card.userId, String(index * 9 + 2)],
        );
      }
    }

    for (const rsvp of seedRsvps) {
      await client.query(
        `INSERT INTO rsvps (event_id, user_id, state, at)
         VALUES ($1, $2, $3, $4)`,
        [rsvp.eventId, rsvp.userId, rsvp.state, rsvp.at],
      );
    }

    // Screens first without their active playlist: the playlist rows they
    // point at do not exist yet, and the two tables reference each other.
    for (const screen of seedScreens) {
      await client.query(
        `INSERT INTO screens
           (id, name, location, theme, pairing_code, paired, last_seen)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          screen.id,
          screen.name,
          screen.location,
          screen.theme,
          screen.pairingCode,
          screen.paired,
          screen.lastSeen,
        ],
      );
    }

    for (const playlist of seedPlaylists) {
      await client.query(
        `INSERT INTO playlists (id, screen_id, name, active, updated_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          playlist.id,
          playlist.screenId,
          playlist.name,
          playlist.active,
          playlist.updatedAt,
        ],
      );

      // Array index is the running order on the TV, so it becomes `position`.
      for (const [position, slide] of playlist.slides.entries()) {
        await client.query(
          `INSERT INTO slides
             (id, playlist_id, position, type, image_url, event_id, headline,
              cta, event_limit, duration_sec, enabled, start_at, end_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            slide.id,
            playlist.id,
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

    for (const screen of seedScreens) {
      if (screen.activePlaylistId !== null) {
        await client.query(
          'UPDATE screens SET active_playlist_id = $2 WHERE id = $1',
          [screen.id, screen.activePlaylistId],
        );
      }
    }

    for (const entry of seedActivity) {
      await client.query(
        'INSERT INTO activity (id, kind, message, at) VALUES ($1, $2, $3, $4)',
        [entry.id, entry.kind, entry.message, entry.at],
      );
    }

    await client.query('COMMIT');

    const counts = await client.query<{table: string; n: string}>(`
      SELECT 'users' AS table, count(*)::text AS n FROM users
      UNION ALL SELECT 'event_requests', count(*)::text FROM event_requests
      UNION ALL SELECT 'request_dates',  count(*)::text FROM request_dates
      UNION ALL SELECT 'events',         count(*)::text FROM events
      UNION ALL SELECT 'rsvps',          count(*)::text FROM rsvps
      UNION ALL SELECT 'stamp_cards',    count(*)::text FROM stamp_cards
      UNION ALL SELECT 'stamp_events',   count(*)::text FROM stamp_events
      UNION ALL SELECT 'screens',        count(*)::text FROM screens
      UNION ALL SELECT 'playlists',      count(*)::text FROM playlists
      UNION ALL SELECT 'slides',         count(*)::text FROM slides
      UNION ALL SELECT 'activity',       count(*)::text FROM activity
      ORDER BY 1
    `);
    for (const row of counts.rows) {
      console.log(`  ${row.table.padEnd(15)} ${row.n}`);
    }
    console.log('seeded');
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
