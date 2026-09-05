import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {db, logActivity, newId} from '@/lib/store';

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }
  const screenId = new URL(request.url).searchParams.get('screenId');
  const playlists =
    screenId === null
      ? db.playlists
      : db.playlists.filter(playlist => playlist.screenId === screenId);
  return NextResponse.json({playlists});
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const body = (await request.json()) as {screenId?: string; name?: string};
  const screen = db.screens.find(candidate => candidate.id === body.screenId);
  if (screen === undefined) {
    return NextResponse.json({error: 'No such screen.'}, {status: 404});
  }

  const playlist = {
    id: newId('p'),
    screenId: screen.id,
    name: body.name?.trim() ?? 'New playlist',
    slides: [],
    active: false,
    updatedAt: new Date().toISOString(),
  };
  db.playlists.push(playlist);
  logActivity('screen', `Created playlist “${playlist.name}”`);
  return NextResponse.json({playlist}, {status: 201});
}
