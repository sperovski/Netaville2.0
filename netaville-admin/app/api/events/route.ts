import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {createEvent, listEvents, logActivity} from '@/lib/store';
import {DIETARY_OPTIONS, type Dietary, type NetavilleEvent} from '@/lib/types';

export async function GET() {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }
  return NextResponse.json({events: await listEvents()});
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const body = (await request.json()) as Partial<NetavilleEvent>;
  const title = (body.title ?? '').trim();
  if (title.length === 0) {
    return NextResponse.json({error: 'An event needs a title.'}, {status: 400});
  }

  const created = await createEvent({
    title,
    description: body.description ?? '',
    date: body.date ?? new Date().toISOString().slice(0, 10),
    startTime: body.startTime ?? '18:00',
    endTime: body.endTime ?? '20:00',
    room: body.room ?? 'Amphitheatre',
    category: body.category ?? 'Community',
    priceInfo: body.priceInfo ?? 'Free',
    cafeteriaDiscount: body.cafeteriaDiscount ?? 0,
    catering: body.catering ?? 'None',
    dietary: (body.dietary ?? []).filter((value): value is Dietary =>
      DIETARY_OPTIONS.includes(value as Dietary),
    ),
    foodNotes: body.foodNotes ?? '',
    drinks: body.drinks ?? false,
    openTo: body.openTo ?? 'Open to all',
    published: body.published ?? false,
  });
  await logActivity('event', `Created “${created.title}”`);
  return NextResponse.json({event: created}, {status: 201});
}
