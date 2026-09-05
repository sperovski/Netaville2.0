import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {db, logActivity} from '@/lib/store';

type Params = {params: Promise<{id: string}>};

export async function PATCH(request: Request, {params}: Params) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const {id} = await params;
  const screen = db.screens.find(candidate => candidate.id === id);
  if (screen === undefined) {
    return NextResponse.json({error: 'No such screen.'}, {status: 404});
  }

  const body = (await request.json()) as {
    name?: string;
    location?: string;
    unpair?: boolean;
  };

  if (body.name !== undefined) {
    screen.name = body.name.trim();
  }
  if (body.location !== undefined) {
    screen.location = body.location.trim();
  }
  if (body.unpair === true) {
    screen.paired = false;
    screen.online = false;
    logActivity('screen', `Unpaired “${screen.name}”`);
  }

  return NextResponse.json({screen});
}

export async function DELETE(_request: Request, {params}: Params) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const {id} = await params;
  const index = db.screens.findIndex(candidate => candidate.id === id);
  if (index === -1) {
    return NextResponse.json({error: 'No such screen.'}, {status: 404});
  }

  const [removed] = db.screens.splice(index, 1);
  db.playlists = db.playlists.filter(playlist => playlist.screenId !== id);
  logActivity('screen', `Removed “${removed!.name}”`);
  return NextResponse.json({ok: true});
}
