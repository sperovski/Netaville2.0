import {NextResponse} from 'next/server';
import {createRequest, logActivity} from '@/lib/store';
import {requireStudent} from '@/lib/student';
import {
  DIETARY_OPTIONS,
  type Dietary,
  type EventCategory,
} from '@/lib/types';

/** How many alternative slots an organiser may offer. */
const MAX_DATES = 4;

const CATEGORIES: EventCategory[] = [
  'Workshop',
  'Social',
  'Talk',
  'Quiz',
  'Community',
  'Private',
];

type Slot = {date?: unknown; startTime?: unknown; endTime?: unknown};

type Body = {
  title?: unknown;
  description?: unknown;
  category?: unknown;
  dates?: unknown;
  room?: unknown;
  catering?: unknown;
  dietary?: unknown;
  foodNotes?: unknown;
  expectedParticipants?: unknown;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

/** A slot is only usable if all three parts parse and it runs forwards. */
function readSlot(value: unknown): {date: string; startTime: string; endTime: string} | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const {date, startTime, endTime} = value as Slot;
  if (
    typeof date !== 'string' ||
    typeof startTime !== 'string' ||
    typeof endTime !== 'string' ||
    !ISO_DATE.test(date) ||
    !TIME.test(startTime) ||
    !TIME.test(endTime) ||
    endTime <= startTime
  ) {
    return null;
  }
  return {date, startTime, endTime};
}

/** A student asking for an event. It lands in the panel's Requests queue. */
export async function POST(request: Request) {
  const gate = await requireStudent(request);
  if ('response' in gate) {
    return gate.response;
  }

  const body = (await request.json()) as Body;

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (title.length === 0) {
    return NextResponse.json({error: 'Give the event a title.'}, {status: 400});
  }

  // At least one workable slot, at most four. Offering alternatives is what
  // turns a rejection-and-resubmit into a single decision, but a list of
  // twenty is a scheduling problem rather than a request.
  const raw = Array.isArray(body.dates) ? body.dates : [];
  const dates = raw.map(readSlot).filter(slot => slot !== null);
  if (dates.length === 0) {
    return NextResponse.json(
      {error: 'Offer at least one date and time that would work.'},
      {status: 400},
    );
  }
  if (dates.length > MAX_DATES) {
    return NextResponse.json(
      {error: `Offer at most ${MAX_DATES} dates.`},
      {status: 400},
    );
  }

  const participants = Number(body.expectedParticipants ?? 0);
  if (!Number.isFinite(participants) || participants < 1) {
    return NextResponse.json(
      {error: 'Expected participants must be at least 1.'},
      {status: 400},
    );
  }

  // Anything outside the fixed vocabulary is dropped rather than refused —
  // an older build sending a retired option should not fail the whole request.
  const dietary = (Array.isArray(body.dietary) ? body.dietary : []).filter(
    (value): value is Dietary =>
      DIETARY_OPTIONS.includes(value as Dietary),
  );

  const category = CATEGORIES.find(candidate => candidate === body.category);

  const created = await createRequest({
    title,
    description:
      typeof body.description === 'string' ? body.description.trim() : '',
    requesterId: gate.user.id,
    category: category ?? 'Community',
    dates,
    room: typeof body.room === 'string' ? body.room : 'Amphitheatre',
    catering: typeof body.catering === 'string' ? body.catering : 'None',
    dietary,
    foodNotes:
      typeof body.foodNotes === 'string' ? body.foodNotes.trim() : '',
    expectedParticipants: Math.round(participants),
  });
  await logActivity('request', `${gate.user.name} requested “${created.title}”`);

  return NextResponse.json({request: created}, {status: 201});
}
