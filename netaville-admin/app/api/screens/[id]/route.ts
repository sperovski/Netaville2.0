import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {deleteScreen, logActivity, updateScreen} from '@/lib/store';
import type {ScreenTheme} from '@/lib/types';

const THEMES: ScreenTheme[] = ['light', 'dark', 'auto'];

type Params = {params: Promise<{id: string}>};

export async function PATCH(request: Request, {params}: Params) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const {id} = await params;
  const body = (await request.json()) as {
    name?: string;
    location?: string;
    theme?: string;
    unpair?: boolean;
  };

  const theme = THEMES.find(candidate => candidate === body.theme);
  if (body.theme !== undefined && theme === undefined) {
    return NextResponse.json(
      {error: 'A screen theme is light, dark or auto.'},
      {status: 400},
    );
  }

  const screen = await updateScreen(id, {
    ...(body.name === undefined ? {} : {name: body.name.trim()}),
    ...(body.location === undefined ? {} : {location: body.location.trim()}),
    ...(theme === undefined ? {} : {theme}),
    ...(body.unpair === undefined ? {} : {unpair: body.unpair}),
  });
  if (screen === null) {
    return NextResponse.json({error: 'No such screen.'}, {status: 404});
  }

  if (body.unpair === true) {
    await logActivity('screen', `Unpaired “${screen.name}”`);
  }
  return NextResponse.json({screen});
}

export async function DELETE(_request: Request, {params}: Params) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const {id} = await params;
  // Its playlists and their slides go with it, by cascade.
  const removed = await deleteScreen(id);
  if (removed === null) {
    return NextResponse.json({error: 'No such screen.'}, {status: 404});
  }
  await logActivity('screen', `Removed “${removed.name}”`);
  return NextResponse.json({ok: true});
}
