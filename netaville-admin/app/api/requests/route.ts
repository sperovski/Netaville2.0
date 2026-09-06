import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {listRequests} from '@/lib/store';
import type {RequestStatus} from '@/lib/types';

const STATUSES: RequestStatus[] = ['pending', 'approved', 'rejected'];

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  // An unrecognised ?status= filters to nothing rather than reaching the query
  // as a value the column can never hold.
  const status = new URL(request.url).searchParams.get('status');
  const filter = STATUSES.find(candidate => candidate === status);
  if (status !== null && status !== 'all' && filter === undefined) {
    return NextResponse.json({requests: []});
  }

  return NextResponse.json({requests: await listRequests(filter)});
}
