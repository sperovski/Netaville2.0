import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {createPlaylist, listPlaylists, logActivity, screenById} from '@/lib/store';

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }
  const screenId = new URL(request.url).searchParams.get('screenId');
  const playlists = await listPlaylists(screenId ?? undefined);
  return NextResponse.json({playlists});
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const body = (await request.json()) as {screenId?: string; name?: string};
  const screen =
    body.screenId === undefined ? null : await screenById(body.screenId);
  if (screen === null) {
    return NextResponse.json({error: 'No such screen.'}, {status: 404});
  }

  const playlist = await createPlaylist(
    screen.id,
    body.name?.trim() ?? 'New playlist',
  );
  await logActivity('screen', `Created playlist “${playlist.name}”`);
  return NextResponse.json({playlist}, {status: 201});
}
