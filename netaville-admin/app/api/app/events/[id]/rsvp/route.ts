import {NextResponse} from 'next/server';
import {toAppEvent} from '@/lib/appFeed';
import {eventById, setRsvp} from '@/lib/store';
import {requireStudent} from '@/lib/student';

type Params = {params: Promise<{id: string}>};

/**
 * Sets this student's answer for one event.
 *
 * A PUT rather than a POST toggle: the app already knows which state it wants,
 * and sending it outright means a retry or a double-tap cannot land the two
 * sides on opposite answers.
 */
export async function PUT(request: Request, {params}: Params) {
  const gate = await requireStudent(request);
  if ('response' in gate) {
    return gate.response;
  }

  const {id} = await params;
  const event = await eventById(id);
  if (event === null || !event.published) {
    return NextResponse.json({error: 'No such event.'}, {status: 404});
  }

  const body = (await request.json()) as {going?: boolean};
  if (typeof body.going !== 'boolean') {
    return NextResponse.json(
      {error: 'Send {"going": true | false}.'},
      {status: 400},
    );
  }

  // setRsvp also keeps the student's answer counter in step, and only when the
  // answer actually changed.
  await setRsvp(id, gate.user.id, body.going);

  const updated = await toAppEvent(id, gate.user.id);
  if (updated === null) {
    return NextResponse.json({error: 'No such event.'}, {status: 404});
  }
  return NextResponse.json({event: updated});
}
