import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {db, logActivity, newId} from '@/lib/store';
import type {NetavilleEvent} from '@/lib/types';

export async function GET() {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }
  const events = [...db.events].sort((a, b) => a.date.localeCompare(b.date));
  return NextResponse.json({events});
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const body = (await request.json()) as Partial<NetavilleEvent>;
  if ((body.title ?? '').trim().length === 0) {
    return NextResponse.json({error: 'An event needs a title.'}, {status: 400});
  }

  const created: NetavilleEvent = {
    id: newId('e'),
    title: body.title!.trim(),
    description: body.description ?? '',
    date: body.date ?? new Date().toISOString().slice(0, 10),
    startTime: body.startTime ?? '18:00',
    endTime: body.endTime ?? '20:00',
    room: body.room ?? 'Amphitheatre',
    category: body.category ?? 'Community',
    priceInfo: body.priceInfo ?? 'Free',
    cafeteriaDiscount: body.cafeteriaDiscount ?? 0,
    catering: body.catering ?? 'None',
    published: body.published ?? false,
  };
  db.events.push(created);
  logActivity('event', `Created “${created.title}”`);
  return NextResponse.json({event: created}, {status: 201});
}
