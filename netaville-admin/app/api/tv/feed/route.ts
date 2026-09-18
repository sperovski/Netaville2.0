import {NextResponse} from 'next/server';
import {buildScreenFeed} from '@/lib/feed';
import {touchScreenByToken} from '@/lib/store';
import {deviceTokenFromRequest, hashToken} from '@/lib/tvToken';

/**
 * What an enrolled TV polls.
 *
 * Authenticated by the device token from /tv enrolment — the screen id is no
 * longer a credential, so this endpoint cannot be walked by guessing ids the
 * way /api/screens/[id]/feed could. The token lookup doubles as the online
 * heartbeat: one statement checks the caller and records that it was seen.
 *
 * `Cache-Control: no-store` because the whole point of the poll is to notice a
 * playlist change; a cached response would pin a stale rotation on the wall.
 */
export async function GET(request: Request) {
  const token = deviceTokenFromRequest(request);
  if (token === null) {
    return NextResponse.json(
      {error: 'This screen is not enrolled.'},
      {status: 401, headers: {'WWW-Authenticate': 'Bearer'}},
    );
  }

  const screen = await touchScreenByToken(hashToken(token));
  if (screen === null) {
    // The token was revoked (screen deleted) or never existed. The device
    // clears its stored token and re-enrols.
    return NextResponse.json({error: 'This screen is no longer registered.'}, {
      status: 401,
      headers: {'WWW-Authenticate': 'Bearer'},
    });
  }

  const feed = await buildScreenFeed(screen.id);
  if (feed === null) {
    return NextResponse.json({error: 'This screen is no longer registered.'}, {
      status: 404,
    });
  }
  return NextResponse.json(feed, {headers: {'Cache-Control': 'no-store'}});
}

/**
 * The device reporting on itself — user agent, viewport, the slide on screen,
 * a playback error. Diagnostics for the panel, never a security input, so a
 * bad body just does nothing.
 */
export async function POST(request: Request) {
  const token = deviceTokenFromRequest(request);
  if (token === null) {
    return NextResponse.json({error: 'Not enrolled.'}, {status: 401});
  }
  const body = (await request.json().catch(() => ({}))) as {
    device?: Record<string, unknown>;
  };
  const info =
    body.device !== null && typeof body.device === 'object' ? body.device : {};
  const screen = await touchScreenByToken(hashToken(token), info);
  return screen === null
    ? NextResponse.json({error: 'Not enrolled.'}, {status: 401})
    : NextResponse.json({ok: true});
}
