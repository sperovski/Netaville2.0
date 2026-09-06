import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {logActivity, setStudentActive} from '@/lib/store';

type Params = {params: Promise<{id: string}>};

/** The only write the panel allows on a student: activate or deactivate. */
export async function PATCH(request: Request, {params}: Params) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const {id} = await params;
  const body = (await request.json()) as {active?: boolean};
  if (typeof body.active !== 'boolean') {
    return NextResponse.json({error: 'Send an "active" flag.'}, {status: 400});
  }

  const student = await setStudentActive(id, body.active);
  if (student === null) {
    return NextResponse.json({error: 'No such student.'}, {status: 404});
  }

  await logActivity(
    'auth',
    `${body.active ? 'Reactivated' : 'Deactivated'} ${student.name}`,
  );
  return NextResponse.json({student});
}
