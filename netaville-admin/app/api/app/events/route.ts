import {NextResponse} from 'next/server';
import {appFeed} from '@/lib/appFeed';
import {requireStudent} from '@/lib/student';

/** The student app's events feed: published events only, as this student sees them. */
export async function GET(request: Request) {
  const gate = await requireStudent(request);
  if ('response' in gate) {
    return gate.response;
  }
  return NextResponse.json({events: await appFeed(gate.user.id)});
}
