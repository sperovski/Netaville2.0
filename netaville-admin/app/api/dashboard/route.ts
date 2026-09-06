import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {
  countPendingRequests,
  countScreens,
  countStudents,
  countUnpublishedEvents,
  listUpcomingEvents,
  recentActivity,
} from '@/lib/store';

export async function GET() {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  // Independent reads, so they go out together rather than in a chain.
  const [pending, upcoming, students, screens, unpublished, activity] =
    await Promise.all([
      countPendingRequests(),
      listUpcomingEvents(),
      countStudents(),
      countScreens(),
      countUnpublishedEvents(),
      recentActivity(8),
    ]);

  return NextResponse.json({
    pendingRequests: pending,
    upcomingEvents: upcoming.length,
    nextEvents: upcoming.slice(0, 4),
    studentsOnline: students.online,
    studentsTotal: students.total,
    screensPlaying: screens.playing,
    screensPaired: screens.paired,
    unpublishedEvents: unpublished,
    activity,
  });
}
