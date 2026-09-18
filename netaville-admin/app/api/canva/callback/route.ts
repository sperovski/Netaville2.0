import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {CanvaError, completeConnection} from '@/lib/canva';
import {logActivity} from '@/lib/store';

const VERIFIER_COOKIE = 'canva_pkce_verifier';
const STATE_COOKIE = 'canva_oauth_state';

/** Where Canva sends the browser back to after consent. */
export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }

  const url = new URL(request.url);
  const displays = new URL('/displays', url.origin);

  const denied = url.searchParams.get('error');
  if (denied !== null) {
    displays.searchParams.set('canva', 'denied');
    return NextResponse.redirect(displays);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const jar = await cookies();
  const verifier = jar.get(VERIFIER_COOKIE)?.value;
  const savedState = jar.get(STATE_COOKIE)?.value;

  const clear = (response: NextResponse) => {
    response.cookies.delete(VERIFIER_COOKIE);
    response.cookies.delete(STATE_COOKIE);
    return response;
  };

  if (
    code === null ||
    state === null ||
    verifier === undefined ||
    savedState === undefined ||
    state !== savedState
  ) {
    displays.searchParams.set('canva', 'failed');
    return clear(NextResponse.redirect(displays));
  }

  try {
    await completeConnection({code, verifier, adminId: gate.user.id});
    await logActivity('screen', `${gate.user.name} connected Canva`);
    displays.searchParams.set('canva', 'connected');
  } catch (caught) {
    displays.searchParams.set(
      'canva',
      caught instanceof CanvaError ? 'failed' : 'failed',
    );
  }
  return clear(NextResponse.redirect(displays));
}
