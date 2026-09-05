import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {db, logActivity, newId, newPairingCode, refreshScreenPresence} from '@/lib/store';

export async function GET() {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }
  refreshScreenPresence();
  return NextResponse.json({screens: db.screens, playlists: db.playlists});
}

/** Registers an unpaired screen, which then shows its code until claimed. */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const body = (await request.json()) as {name?: string; location?: string};
  if ((body.name ?? '').trim().length === 0) {
    return NextResponse.json({error: 'Give the screen a name.'}, {status: 400});
  }

  const screen = {
    id: newId('s'),
    name: body.name!.trim(),
    location: body.location?.trim() ?? '',
    pairingCode: newPairingCode(),
    paired: false,
    online: false,
    lastSeen: new Date(0).toISOString(),
    activePlaylistId: null,
  };
  db.screens.push(screen);
  logActivity('screen', `Added screen “${screen.name}”`);
  return NextResponse.json({screen}, {status: 201});
}
