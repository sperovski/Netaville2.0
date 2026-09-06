import {Pool, types} from 'pg';

/**
 * The Postgres connection.
 *
 * One pool per process, hung off globalThis for the same reason lib/store.ts
 * does it: Next's dev hot-reload re-evaluates modules on every save, and a
 * fresh pool per save leaks connections until Postgres refuses new ones.
 *
 * Nothing here is specific to where the database runs. Local Docker and Neon
 * differ only in DATABASE_URL — the `sslmode=require` that Neon's string
 * carries is what turns TLS on below.
 */

// node-postgres parses DATE columns into a JS Date at the server's local
// midnight, which then serialises back a day early west of UTC. The app treats
// dates as plain 'YYYY-MM-DD' strings throughout, so hand them back untouched.
const DATE_OID = 1082;
types.setTypeParser(DATE_OID, value => value);

// Likewise TIME: 'start_time' is '18:00' to the app, not a Date.
const TIME_OID = 1083;
types.setTypeParser(TIME_OID, value => value.slice(0, 5));

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.length === 0) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env.local, or run ' +
        '`docker compose up -d db` for the local database.',
    );
  }
  return url;
}

function createPool(): Pool {
  const url = connectionString();
  return new Pool({
    connectionString: url,
    // Neon terminates TLS with a public CA, but the container does not speak
    // TLS at all — so ask for it only when the URL says to.
    ssl: url.includes('sslmode=require')
      ? {rejectUnauthorized: true}
      : undefined,
    // Neon's free tier allows a small number of connections, and serverless
    // instances come and go, so stay well under and let idle ones drop.
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

const globalRef = globalThis as typeof globalThis & {__netavillePool?: Pool};

export const pool: Pool = (globalRef.__netavillePool ??= createPool());

/**
 * Runs one statement and returns its rows.
 *
 * Always pass values as `params` — never interpolate them into `text`, which
 * is how SQL injection gets in.
 */
export async function query<Row extends Record<string, unknown>>(
  text: string,
  params: readonly unknown[] = [],
): Promise<Row[]> {
  const result = await pool.query<Row>(text, params as unknown[]);
  return result.rows;
}

/** The single row a query is expected to return, or null if it matched none. */
export async function queryOne<Row extends Record<string, unknown>>(
  text: string,
  params: readonly unknown[] = [],
): Promise<Row | null> {
  const rows = await query<Row>(text, params);
  return rows[0] ?? null;
}

/**
 * Runs `run` inside a transaction, committing on return and rolling back on
 * throw. Approving a request writes an event, the request's status and an
 * activity row; either all three land or none do.
 */
export async function transaction<T>(
  run: (client: import('pg').PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await run(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
