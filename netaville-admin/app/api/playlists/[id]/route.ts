import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {deletePlaylist, updatePlaylist} from '@/lib/store';
import type {Slide} from '@/lib/types';

type Params = {params: Promise<{id: string}>};

export async function PATCH(request: Request, {params}: Params) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const {id} = await params;
  const body = (await request.json()) as {
    name?: string;
    slides?: Slide[];
    /** "Push to TV": make this the one the screen plays. */
    publish?: boolean;
  };

  // Renaming, rewriting the slides and pushing to the wall all happen in one
  // transaction, so the TV can never poll mid-rewrite.
  const result = await updatePlaylist(id, {
    ...(body.name === undefined ? {} : {name: body.name.trim()}),
    ...(body.slides === undefined ? {} : {slides: body.slides}),
    ...(body.publish === undefined ? {} : {publish: body.publish}),
  });

  if (result === null) {
    return NextResponse.json({error: 'No such playlist.'}, {status: 404});
  }
  if ('error' in result) {
    return NextResponse.json({error: 'No such screen.'}, {status: 404});
  }
  return NextResponse.json({playlist: result});
}

export async function DELETE(_request: Request, {params}: Params) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const {id} = await params;
  // The screen's pointer at it is cleared by the foreign key, and its slides
  // go by cascade.
  const removed = await deletePlaylist(id);
  if (removed === null) {
    return NextResponse.json({error: 'No such playlist.'}, {status: 404});
  }
  return NextResponse.json({ok: true});
}
