import {redirect} from 'next/navigation';
import {Shell} from '@/components/Shell';
import {readSession} from '@/lib/auth';
import {listStudents, stampsToday} from '@/lib/store';
import {CounterView} from './CounterView';

export const metadata = {title: 'Counter · Netaville Admin'};
export const dynamic = 'force-dynamic';

export default async function CounterPage() {
  const admin = await readSession();
  if (admin === null) {
    redirect('/login');
  }

  // The roster is loaded once so a mis-scan can be finished by hand without a
  // round trip — at a till, the fallback has to be faster than the failure.
  const [students, today] = await Promise.all([listStudents(), stampsToday()]);

  return (
    <Shell
      title="Counter"
      hint="Scan a student's card to add a stamp or hand over a free coffee."
      admin={{name: admin.name, email: admin.email}}>
      <CounterView
        students={students.map(student => ({
          id: student.id,
          name: student.name,
          email: student.email,
        }))}
        today={today}
      />
    </Shell>
  );
}
