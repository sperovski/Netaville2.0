import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {db} from '@/lib/store';

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const query = (new URL(request.url).searchParams.get('q') ?? '')
    .trim()
    .toLowerCase();

  const students = db.users
    .filter(user => user.role === 'student')
    .filter(
      user =>
        query.length === 0 ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query),
    )
    .sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));

  return NextResponse.json({students});
}
