import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {db, logActivity} from '@/lib/store';
import type {NetavilleEvent} from '@/lib/types';

type Params = {params: Promise<{id: string}>};

export async function PATCH(request: Request, {params}: Params) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const {id} = await params;
  const event = db.events.find(candidate => candidate.id === id);
  if (event === undefined) {
    return NextResponse.json({error: 'No such event.'}, {status: 404});
  }

  const body = (await request.json()) as Partial<NetavilleEvent>;
  const wasPublished = event.published;
  Object.assign(event, body, {id: event.id});

  if (body.published !== undefined && body.published !== wasPublished) {
    logActivity(
      'event',
      `${event.published ? 'Published' : 'Unpublished'} “${event.title}”`,
    );
  }
  return NextResponse.json({event});
}

export async function DELETE(_request: Request, {params}: Params) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const {id} = await params;
  const index = db.events.findIndex(candidate => candidate.id === id);
  if (index === -1) {
    return NextResponse.json({error: 'No such event.'}, {status: 404});
  }

  const [removed] = db.events.splice(index, 1);

  // A deleted event would leave announcement slides pointing at nothing, so
  // drop those too rather than letting a TV render a blank card.
  for (const playlist of db.playlists) {
    const before = playlist.slides.length;
    playlist.slides = playlist.slides.filter(slide => slide.eventId !== id);
    if (playlist.slides.length !== before) {
      playlist.updatedAt = new Date().toISOString();
    }
  }

  logActivity('event', `Deleted “${removed!.title}”`);
  return NextResponse.json({ok: true});
}
