import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {db, logActivity, newId, userById} from '@/lib/store';
import type {NetavilleEvent} from '@/lib/types';

type Params = {params: Promise<{id: string}>};

/** Approve (which publishes an event) or reject a student's request. */
export async function PATCH(request: Request, {params}: Params) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const {id} = await params;
  const entry = db.requests.find(candidate => candidate.id === id);
  if (entry === undefined) {
    return NextResponse.json({error: 'No such request.'}, {status: 404});
  }

  const body = (await request.json()) as {
    action?: 'approve' | 'reject';
    reason?: string;
    category?: NetavilleEvent['category'];
    priceInfo?: string;
    cafeteriaDiscount?: number;
  };

  if (entry.status !== 'pending') {
    return NextResponse.json(
      {error: `This request was already ${entry.status}.`},
      {status: 409},
    );
  }

  if (body.action === 'reject') {
    const reason = body.reason?.trim() ?? '';
    if (reason.length === 0) {
      return NextResponse.json(
        {error: 'Give the student a reason for the rejection.'},
        {status: 400},
      );
    }
    entry.status = 'rejected';
    entry.reason = reason;
    logActivity('rejection', `Rejected “${entry.title}”`);
    return NextResponse.json({request: entry});
  }

  if (body.action !== 'approve') {
    return NextResponse.json({error: 'Unknown action.'}, {status: 400});
  }

  entry.status = 'approved';
  const created: NetavilleEvent = {
    id: newId('e'),
    title: entry.title,
    description: `Requested by ${userById(entry.requesterId)?.name ?? 'a student'}.`,
    date: entry.date,
    startTime: entry.startTime,
    endTime: entry.endTime,
    room: entry.room,
    category: body.category ?? 'Community',
    priceInfo: body.priceInfo ?? 'Free',
    cafeteriaDiscount: body.cafeteriaDiscount ?? 0,
    catering: entry.catering,
    // Approving puts it straight in the students' feed, which is the point.
    published: true,
    fromRequestId: entry.id,
  };
  db.events.push(created);
  logActivity('approval', `Approved “${entry.title}” and published the event`);

  return NextResponse.json({request: entry, event: created});
}
