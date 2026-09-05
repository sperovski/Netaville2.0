import {redirect} from 'next/navigation';
import {Shell} from '@/components/Shell';
import {readSession} from '@/lib/auth';
import {db, userById} from '@/lib/store';
import {RequestsView, type RequestRow} from './RequestsView';

export const metadata = {title: 'Event requests · Netaville Admin'};
export const dynamic = 'force-dynamic';

export default async function RequestsPage() {
  const admin = await readSession();
  if (admin === null) {
    redirect('/login');
  }

  const rows: RequestRow[] = [...db.requests]
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .map(entry => ({
      ...entry,
      requester: userById(entry.requesterId)?.name ?? 'Unknown student',
      requesterEmail: userById(entry.requesterId)?.email ?? '',
    }));

  return (
    <Shell
      title="Event requests"
      hint="Approve a request to publish it into the students' feed."
      admin={{name: admin.name, email: admin.email}}>
      <RequestsView rows={rows} />
    </Shell>
  );
}
