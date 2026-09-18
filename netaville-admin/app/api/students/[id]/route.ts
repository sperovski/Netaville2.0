import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {revokeAllForUser} from '@/lib/refreshTokens';
import {logActivity, setStudentActive} from '@/lib/store';

type Params = {params: Promise<{id: string}>};

/** The only write the panel allows on a student: activate or deactivate. */
export async function PATCH(request: Request, {params}: Params) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const {id} = await params;
  const body = (await request.json().catch(() => ({}))) as {active?: boolean};
  if (typeof body.active !== 'boolean') {
    return NextResponse.json({error: 'Send an "active" flag.'}, {status: 400});
  }

  const student = await setStudentActive(id, body.active);
  if (student === null) {
    return NextResponse.json({error: 'No such student.'}, {status: 404});
  }

  if (!body.active) {
    // Deactivating has to reach the phone already holding a session, not just
    // the next sign-in. Revoking every refresh family stops new access tokens
    // being minted; the one the device holds lapses within the quarter hour,
    // and lib/student.ts refuses an inactive account before then anyway.
    await revokeAllForUser(student.id);
  }

  await logActivity(
    'auth',
    `${body.active ? 'Reactivated' : 'Deactivated'} ${student.name}`,
  );
  return NextResponse.json({student});
}
