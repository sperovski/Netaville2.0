import {redirect} from 'next/navigation';
import {Shell} from '@/components/Shell';
import {readSession} from '@/lib/auth';
import {db} from '@/lib/store';
import {EventsView} from './EventsView';

export const metadata = {title: 'Events · Netaville Admin'};
export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const admin = await readSession();
  if (admin === null) {
    redirect('/login');
  }

  const events = [...db.events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Shell
      title="Events"
      hint="Everything here is the source of the students' event feed."
      admin={{name: admin.name, email: admin.email}}>
      <EventsView events={events} />
    </Shell>
  );
}
