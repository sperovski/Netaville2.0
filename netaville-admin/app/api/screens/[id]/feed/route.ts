import {NextResponse} from 'next/server';
import {buildScreenFeed} from '@/lib/feed';

type Params = {params: Promise<{id: string}>};

/**
 * What the physical TV polls. Deliberately unauthenticated: the screen is a
 * kiosk with no keyboard, and the payload is public signage either way. The id
 * is the only secret, and polling is what marks the screen online.
 */
export async function GET(_request: Request, {params}: Params) {
  const {id} = await params;
  const feed = await buildScreenFeed(id);
  if (feed === null) {
    return NextResponse.json({error: 'No such screen.'}, {status: 404});
  }
  return NextResponse.json(feed, {headers: {'Cache-Control': 'no-store'}});
}
