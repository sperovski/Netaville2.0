import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {deleteEvent, eventById, logActivity, updateEvent} from '@/lib/store';
import type {NetavilleEvent} from '@/lib/types';

type Params = {params: Promise<{id: string}>};

export async function PATCH(request: Request, {params}: Params) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const {id} = await params;
  const before = await eventById(id);
  if (before === null) {
    return NextResponse.json({error: 'No such event.'}, {status: 404});
  }

  const body = (await request.json()) as Partial<NetavilleEvent>;
  // `id` is not editable, and neither is the link back to the request that
  // created the event — both would just break references.
  delete body.id;
  delete body.fromRequestId;
  const patch = body;

  const event = await updateEvent(id, patch);
  if (event === null) {
    return NextResponse.json({error: 'No such event.'}, {status: 404});
  }

  if (patch.published !== undefined && patch.published !== before.published) {
    await logActivity(
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
  // Announcement slides built from the event go with it, and any playlist that
  // lost one is stamped as changed — both inside deleteEvent's transaction.
  const removed = await deleteEvent(id);
  if (removed === null) {
    return NextResponse.json({error: 'No such event.'}, {status: 404});
  }
  return NextResponse.json({ok: true});
}
