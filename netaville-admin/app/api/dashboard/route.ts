import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {db, refreshScreenPresence} from '@/lib/store';

export async function GET() {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }
  refreshScreenPresence();

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = db.events
    .filter(event => event.published && event.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const screens = db.screens.filter(screen => screen.paired);
  const playing = screens.filter(
    screen => screen.online && screen.activePlaylistId !== null,
  );

  return NextResponse.json({
    pendingRequests: db.requests.filter(entry => entry.status === 'pending')
      .length,
    upcomingEvents: upcoming.length,
    nextEvents: upcoming.slice(0, 4),
    studentsOnline: db.users.filter(
      user => user.role === 'student' && user.online && user.active,
    ).length,
    studentsTotal: db.users.filter(user => user.role === 'student').length,
    screensPlaying: playing.length,
    screensPaired: screens.length,
    unpublishedEvents: db.events.filter(event => !event.published).length,
    activity: db.activity.slice(0, 8),
  });
}
