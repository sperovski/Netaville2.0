import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {
  createScreen,
  listPlaylists,
  listScreens,
  logActivity,
  newPairingCode,
} from '@/lib/store';

export async function GET() {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }
  const [screens, playlists] = await Promise.all([
    listScreens(),
    listPlaylists(),
  ]);
  return NextResponse.json({screens, playlists});
}

/** Registers an unpaired screen, which then shows its code until claimed. */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const body = (await request.json()) as {name?: string; location?: string};
  const name = (body.name ?? '').trim();
  if (name.length === 0) {
    return NextResponse.json({error: 'Give the screen a name.'}, {status: 400});
  }

  const screen = await createScreen({
    name,
    location: body.location?.trim() ?? '',
    pairingCode: await newPairingCode(),
  });
  await logActivity('screen', `Added screen “${screen.name}”`);
  return NextResponse.json({screen}, {status: 201});
}
