import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {logActivity, pairScreen} from '@/lib/store';

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

  const result = await pairScreen(code);
  if ('error' in result) {
    return result.error === 'unknown'
      ? NextResponse.json(
          {error: 'No screen is showing that code.'},
          {status: 404},
        )
      : NextResponse.json({error: 'That screen is already paired.'}, {status: 409});
  }

  await logActivity('screen', `Paired “${result.screen.name}”`);
  return NextResponse.json({screen: result.screen});
}
