import {redirect} from 'next/navigation';
import {Shell} from '@/components/Shell';
import {readSession} from '@/lib/auth';
import {listPlaylists, listPublishedEvents, listScreens} from '@/lib/store';
import {DisplaysView} from './DisplaysView';

export const metadata = {title: 'TV displays · Netaville Admin'};
export const dynamic = 'force-dynamic';

export default async function DisplaysPage() {
  const admin = await readSession();
  if (admin === null) {
    redirect('/login');
  }

  const [screens, playlists, events] = await Promise.all([
    listScreens(),
    listPlaylists(),
    listPublishedEvents(),
  ]);

  return (
    <Shell
      title="TV displays"
      hint="Pair a screen, build its playlist, push it to the wall."
      admin={{name: admin.name, email: admin.email}}>
      <DisplaysView
        screens={screens}
        playlists={playlists}
        events={events.map(event => ({
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
