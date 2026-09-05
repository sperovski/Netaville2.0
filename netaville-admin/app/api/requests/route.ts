import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {db, userById} from '@/lib/store';
import type {RequestStatus} from '@/lib/types';

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const status = new URL(request.url).searchParams.get('status');
  const all = [...db.requests].sort((a, b) =>
    b.submittedAt.localeCompare(a.submittedAt),
  );
  const filtered =
    status === null || status === 'all'
      ? all
      : all.filter(entry => entry.status === (status as RequestStatus));

  return NextResponse.json({
    requests: filtered.map(entry => ({
      ...entry,
      requester: userById(entry.requesterId)?.name ?? 'Unknown student',
      requesterEmail: userById(entry.requesterId)?.email ?? '',
    })),
  });
}
