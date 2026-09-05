import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {db, logActivity} from '@/lib/store';
import type {Slide} from '@/lib/types';

type Params = {params: Promise<{id: string}>};

export async function PATCH(request: Request, {params}: Params) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const {id} = await params;
  const playlist = db.playlists.find(candidate => candidate.id === id);
  if (playlist === undefined) {
    return NextResponse.json({error: 'No such playlist.'}, {status: 404});
  }

  const body = (await request.json()) as {
    name?: string;
    slides?: Slide[];
    /** "Push to TV": make this the one the screen plays. */
    publish?: boolean;
  };

  if (body.name !== undefined) {
    playlist.name = body.name.trim();
  }
  if (body.slides !== undefined) {
    playlist.slides = body.slides;
  }

  if (body.publish === true) {
    const screen = db.screens.find(
      candidate => candidate.id === playlist.screenId,
    );
    if (screen === undefined) {
      return NextResponse.json({error: 'No such screen.'}, {status: 404});
    }
    // Only one playlist plays per screen, so stand the others down.
    for (const other of db.playlists) {
      if (other.screenId === playlist.screenId) {
        other.active = other.id === playlist.id;
      }
    }
    screen.activePlaylistId = playlist.id;
    logActivity('screen', `Pushed “${playlist.name}” to ${screen.name}`);
  }

  playlist.updatedAt = new Date().toISOString();
  return NextResponse.json({playlist});
}

export async function DELETE(_request: Request, {params}: Params) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const {id} = await params;
  const index = db.playlists.findIndex(candidate => candidate.id === id);
  if (index === -1) {
    return NextResponse.json({error: 'No such playlist.'}, {status: 404});
  }

  const [removed] = db.playlists.splice(index, 1);
  const screen = db.screens.find(
    candidate => candidate.id === removed!.screenId,
  );
  if (screen?.activePlaylistId === removed!.id) {
    screen.activePlaylistId = null;
  }
  return NextResponse.json({ok: true});
}
