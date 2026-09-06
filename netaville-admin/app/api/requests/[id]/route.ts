import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {approveRequest, rejectRequest, requestById} from '@/lib/store';
import type {NetavilleEvent} from '@/lib/types';

type Params = {params: Promise<{id: string}>};

/** Approve (which publishes an event) or reject a student's request. */
export async function PATCH(request: Request, {params}: Params) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const {id} = await params;
  const body = (await request.json()) as {
    action?: 'approve' | 'reject';
    reason?: string;
    /** Which proposed slot to run it on; defaults to the organiser's first. */
    chosenDateId?: string;
    category?: NetavilleEvent['category'];
    priceInfo?: string;
    cafeteriaDiscount?: number;
    drinks?: boolean;
    openTo?: string;
  };

  if (body.action !== 'approve' && body.action !== 'reject') {
    return NextResponse.json({error: 'Unknown action.'}, {status: 400});
  }

  if (body.action === 'reject') {
    const reason = body.reason?.trim() ?? '';
    if (reason.length === 0) {
      return NextResponse.json(
        {error: 'Give the student a reason for the rejection.'},
        {status: 400},
      );
    }
    const rejected = await rejectRequest(id, reason);
    return rejected === null
      ? notPending(id)
      : NextResponse.json({request: rejected});
  }

  const approved = await approveRequest(id, body);
  if (approved === null) {
    return notPending(id);
  }
  if ('error' in approved) {
    return NextResponse.json(
      {error: 'That date is not one of the ones proposed.'},
      {status: 400},
    );
  }
  return NextResponse.json(approved);
}

/**
 * Both writes decide pending-ness inside the UPDATE, so a null answer means
 * either "no such request" or "someone else got there first" — which one is
 * only knowable by looking afterwards.
 */
async function notPending(id: string): Promise<NextResponse> {
  const entry = await requestById(id);
  if (entry === null) {
    return NextResponse.json({error: 'No such request.'}, {status: 404});
  }
  return NextResponse.json(
    {error: `This request was already ${entry.status}.`},
    {status: 409},
  );
}
