import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {
  addStamp,
  cardFor,
  cardHistory,
  redeemReward,
  removeStamp,
  userById,
} from '@/lib/store';
import {readStampCode} from '@/lib/stampCode';
import type {CounterView} from '@/lib/types';

/**
 * The counter.
 *
 * Staff scan the QR on a student's card and this decides what it means. Both
 * halves are here because they are the same operation from the till's point of
 * view: read the code, then act on the person it names.
 *
 * Admin-only. The code check refuses a forwarded screenshot, but it is not a
 * signature — what actually stands behind a stamp is that a member of staff
 * scanned a phone held by the person in front of them.
 */

type Body = {
  /** The scanned QR payload. */
  code?: unknown;
  /** Or a student picked from the panel, for a manual correction. */
  userId?: unknown;
  action?: unknown;
};

const ACTIONS = ['resolve', 'add', 'remove', 'redeem'] as const;

/** Everything the counter screen draws for one student. */
async function viewFor(userId: string): Promise<CounterView | null> {
  const student = await userById(userId);
  if (student === null || student.role !== 'student') {
    return null;
  }
  const [card, history] = await Promise.all([
    cardFor(userId),
    cardHistory(userId),
  ]);
  return {
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      active: student.active,
    },
    card,
    history,
  };
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const body = (await request.json()) as Body;
  const action = ACTIONS.find(candidate => candidate === body.action);
  if (action === undefined) {
    return NextResponse.json(
      {error: 'Send an action of resolve, add, remove or redeem.'},
      {status: 400},
    );
  }

  // A scanned code and a hand-picked student both end as a user id; the code
  // is the one that has to be checked before it is trusted.
  let userId: string;
  if (typeof body.code === 'string' && body.code.length > 0) {
    const scan = readStampCode(body.code);
    if (!scan.ok) {
      return NextResponse.json(
        {
          error:
            scan.reason === 'expired'
              ? 'That code has expired. Ask them to show the card again.'
              : 'That is not a Netaville card code.',
        },
        {status: 400},
      );
    }
    userId = scan.userId;
  } else if (typeof body.userId === 'string' && body.userId.length > 0) {
    userId = body.userId;
  } else {
    return NextResponse.json(
      {error: 'Scan a card or pick a student.'},
      {status: 400},
    );
  }

  const student = await userById(userId);
  if (student === null || student.role !== 'student') {
    return NextResponse.json(
      {error: 'That code does not match a student.'},
      {status: 404},
    );
  }
  // A deactivated account keeps its card and its history, but the counter
  // stops here rather than adding to it.
  if (!student.active && action !== 'resolve') {
    return NextResponse.json(
      {error: `${student.name}'s account is deactivated.`},
      {status: 403},
    );
  }

  const actorId = gate.user.id;
  let earnedReward = false;

  if (action === 'add') {
    earnedReward = (await addStamp(userId, actorId)).earnedReward;
  } else if (action === 'remove') {
    await removeStamp(userId, actorId);
  } else if (action === 'redeem') {
    const result = await redeemReward(userId, actorId);
    if ('error' in result) {
      return NextResponse.json(
        {error: `${student.name} has no free coffees banked.`},
        {status: 409},
      );
    }
  }

  const view = await viewFor(userId);
  if (view === null) {
    return NextResponse.json({error: 'That student is gone.'}, {status: 404});
  }
  return NextResponse.json({...view, earnedReward});
}
