import {redirect} from 'next/navigation';
import {Shell} from '@/components/Shell';
import {readSession} from '@/lib/auth';
import {listRequests} from '@/lib/store';
import {RequestsView, type RequestRow} from './RequestsView';

export const metadata = {title: 'Event requests · Netaville Admin'};
export const dynamic = 'force-dynamic';

export default async function RequestsPage() {
  const admin = await readSession();
  if (admin === null) {
    redirect('/login');
  }

  const rows: RequestRow[] = await listRequests();

  return (
    <Shell
      title="Event requests"
      hint="Approve a request to publish it into the students' feed."
      admin={{name: admin.name, email: admin.email}}>
      <RequestsView rows={rows} />
    </Shell>
  );
}
