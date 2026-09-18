import {randomBytes} from 'node:crypto';
import {NextResponse} from 'next/server';
import {requireAdmin} from '@/lib/auth';
import {authorizeUrl, isCanvaConfigured, pkce} from '@/lib/canva';

const VERIFIER_COOKIE = 'canva_pkce_verifier';
const STATE_COOKIE = 'canva_oauth_state';

/** Kicks off the Canva OAuth: stash PKCE + state, bounce to Canva's consent page. */
export async function GET() {
  const gate = await requireAdmin();
  if ('response' in gate) {
    return gate.response;
  }
  if (!isCanvaConfigured) {
    return NextResponse.json(
      {error: 'Canva is not configured. Set CANVA_CLIENT_ID and CANVA_CLIENT_SECRET.'},
      {status: 501},
    );
  }

  const {verifier, challenge} = pkce();
  const state = randomBytes(16).toString('base64url');

  const response = NextResponse.redirect(authorizeUrl({state, challenge}));
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 600,
  };
  response.cookies.set(VERIFIER_COOKIE, verifier, options);
  response.cookies.set(STATE_COOKIE, state, options);
  return response;
}
