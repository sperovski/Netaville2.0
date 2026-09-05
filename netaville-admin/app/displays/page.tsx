import {redirect} from 'next/navigation';
import {Shell} from '@/components/Shell';
import {readSession} from '@/lib/auth';
import {db, refreshScreenPresence} from '@/lib/store';
import {DisplaysView} from './DisplaysView';

export const metadata = {title: 'TV displays · Netaville Admin'};
export const dynamic = 'force-dynamic';

export default async function DisplaysPage() {
  const admin = await readSession();
  if (admin === null) {
    redirect('/login');
  }
  refreshScreenPresence();

  return (
    <Shell
      title="TV displays"
      hint="Pair a screen, build its playlist, push it to the wall."
      admin={{name: admin.name, email: admin.email}}>
      <DisplaysView
        screens={structuredClone(db.screens)}
        playlists={structuredClone(db.playlists)}
        events={db.events
          .filter(event => event.published)
          .map(event => ({
            id: event.id,
            title: event.title,
            date: event.date,
            startTime: event.startTime,
            room: event.room,
          }))}
      />
    </Shell>
  );
}
