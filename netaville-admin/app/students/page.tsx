import {redirect} from 'next/navigation';
import {Shell} from '@/components/Shell';
import {readSession} from '@/lib/auth';
import {db} from '@/lib/store';
import {StudentsView} from './StudentsView';

export const metadata = {title: 'Students · Netaville Admin'};
export const dynamic = 'force-dynamic';

export default async function StudentsPage() {
  const admin = await readSession();
  if (admin === null) {
    redirect('/login');
  }

  const students = db.users
    .filter(user => user.role === 'student')
    .sort(
      (a, b) =>
        Number(b.online) - Number(a.online) || a.name.localeCompare(b.name),
    );

  return (
    <Shell
      title="Students"
      hint="Everyone registered in the mobile app."
      admin={{name: admin.name, email: admin.email}}>
      <StudentsView students={students} />
    </Shell>
  );
}
