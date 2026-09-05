import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {db, logActivity} from '@/lib/store';

/** Claims a screen by the 6-digit code it is displaying. */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const body = (await request.json()) as {code?: string};
  const code = (body.code ?? '').replace(/\D/g, '');
  if (code.length !== 6) {
    return NextResponse.json(
      {error: 'A pairing code is six digits.'},
      {status: 400},
    );
  }

  const screen = db.screens.find(candidate => candidate.pairingCode === code);
  if (screen === undefined) {
    return NextResponse.json(
      {error: 'No screen is showing that code.'},
      {status: 404},
    );
  }
  if (screen.paired) {
    return NextResponse.json(
      {error: `“${screen.name}” is already paired.`},
      {status: 409},
    );
  }

  screen.paired = true;
  logActivity('screen', `Paired “${screen.name}”`);
  return NextResponse.json({screen});
}
