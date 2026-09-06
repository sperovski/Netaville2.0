import Link from 'next/link';
import {redirect} from 'next/navigation';
import {Card, CardHeader} from '@/components/Card';
import {Shell} from '@/components/Shell';
import {StatusPill} from '@/components/StatusPill';
import {readSession} from '@/lib/auth';
import {formatDate, isToday, timeAgo} from '@/lib/format';
import {
  countPendingRequests,
  countScreens,
  countStudents,
  listUpcomingEvents,
  recentActivity,
} from '@/lib/store';

export const metadata = {title: 'Dashboard · Netaville Admin'};
export const dynamic = 'force-dynamic';

const activityTone = {
  request: 'cyan',
  approval: 'success',
  rejection: 'coral',
  event: 'brand',
  screen: 'gold',
  auth: 'neutral',
} as const;

function Stat({
  label,
  value,
  hint,
  href,
  tone = 'brand',
}: {
  label: string;
  value: string | number;
  hint: string;
  href: string;
  tone?: 'brand' | 'coral' | 'gold' | 'cyan';
}) {
  const bars = {
    brand: 'bg-brand',
    coral: 'bg-coral',
    gold: 'bg-gold',
    cyan: 'bg-cyan',
  };
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-card border border-line bg-surface p-5 shadow-card transition-colors hover:border-brand-edge">
      <span className={`absolute inset-x-0 top-0 h-1 ${bars[tone]}`} />
      <p className="text-[11px] font-bold uppercase tracking-wider text-dim">
        {label}
      </p>
      <p className="mt-2 text-[34px] font-extrabold leading-none tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-2 text-[12.5px] text-muted">{hint}</p>
    </Link>
  );
}

export default async function DashboardPage() {
  const admin = await readSession();
  if (admin === null) {
    redirect('/login');
  }

  // Six independent reads, so they go out together rather than in a chain.
  const [pending, upcoming, students, screens, activity] = await Promise.all([
    countPendingRequests(),
    listUpcomingEvents(),
    countStudents(),
    countScreens(),
    recentActivity(7),
  ]);

  return (
    <Shell
      title="Dashboard"
      hint="What needs your attention today."
      admin={{name: admin.name, email: admin.email}}>
      <div className="grid grid-cols-4 gap-5">
        <Stat
          label="Pending requests"
          value={pending}
          hint={pending === 0 ? 'Nothing waiting' : 'Waiting on a decision'}
          href="/requests"
          tone="coral"
        />
        <Stat
          label="Upcoming events"
          value={upcoming.length}
          hint="Published and still to come"
          href="/events"
          tone="brand"
        />
        <Stat
          label="Students online"
          value={students.online}
          hint={`of ${students.total} registered`}
          href="/students"
          tone="cyan"
        />
        <Stat
          label="Screens playing"
          value={`${screens.playing}/${screens.paired}`}
          hint={
            screens.playing === screens.paired
              ? 'All paired screens live'
              : 'Some screens are dark'
          }
          href="/displays"
          tone="gold"
        />
      </div>

      <div className="mt-6 grid grid-cols-[1.35fr_1fr] gap-5">
        <Card flush>
          <div className="px-5 pt-5">
            <CardHeader
              title="Next up"
              hint="The published events students see first."
              action={
                <Link
                  href="/events"
                  className="text-[12.5px] font-semibold text-brand hover:underline">
                  Manage
                </Link>
              }
            />
          </div>
          <ul className="divide-y divide-line/70 border-t border-line">
            {upcoming.slice(0, 5).map(event => (
              <li
                key={event.id}
                className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-16 shrink-0 rounded-control border border-brand-edge bg-brand-tint py-1.5 text-center">
                  <p className="text-[15px] font-extrabold leading-tight text-brand">
                    {new Date(`${event.date}T00:00:00`).getDate()}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand/70">
                    {new Date(`${event.date}T00:00:00`).toLocaleDateString(
                      'en-GB',
                      {month: 'short'},
                    )}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-ink">
                    {event.title}
                  </p>
                  <p className="text-[12.5px] text-muted">
                    {event.startTime} · {event.room}
                  </p>
                </div>
                {isToday(event.date) ? (
                  <StatusPill tone="coral">Today</StatusPill>
                ) : (
                  <StatusPill tone="neutral">{formatDate(event.date)}</StatusPill>
                )}
              </li>
            ))}
            {upcoming.length === 0 ? (
              <li className="px-5 py-10 text-center text-[13.5px] text-muted">
                No published events coming up.
              </li>
            ) : null}
          </ul>
        </Card>

        <Card flush>
          <div className="px-5 pt-5">
            <CardHeader title="Recent activity" hint="Across the whole panel." />
          </div>
          <ul className="divide-y divide-line/70 border-t border-line">
            {activity.map(entry => (
              <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
                <span className="pt-0.5">
                  <StatusPill tone={activityTone[entry.kind]}>
                    {entry.kind}
                  </StatusPill>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-ink">
                    {entry.message}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-dim">
                    {timeAgo(entry.at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Shell>
  );
}
