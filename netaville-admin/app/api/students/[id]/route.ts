import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {db, logActivity} from '@/lib/store';

type Params = {params: Promise<{id: string}>};

/** The only write the panel allows on a student: activate or deactivate. */
export async function PATCH(request: Request, {params}: Params) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const {id} = await params;
  const student = db.users.find(
    candidate => candidate.id === id && candidate.role === 'student',
  );
  if (student === undefined) {
    return NextResponse.json({error: 'No such student.'}, {status: 404});
  }

  const body = (await request.json()) as {active?: boolean};
  if (typeof body.active !== 'boolean') {
    return NextResponse.json({error: 'Send an "active" flag.'}, {status: 400});
  }

  student.active = body.active;
  if (!body.active) {
    student.online = false;
  }
  logActivity(
    'auth',
    `${body.active ? 'Reactivated' : 'Deactivated'} ${student.name}`,
  );
  return NextResponse.json({student});
}
