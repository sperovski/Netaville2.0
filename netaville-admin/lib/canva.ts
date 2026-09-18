import {createHash, randomBytes} from 'node:crypto';
import {
  canvaConnection,
  saveCanvaConnection,
  updateCanvaTokens,
} from './store';
import {open, seal} from './secretbox';

/**
 * The panel's link to Canva's Connect API, used to design TV posters and
 * video ads from inside the TV displays screen.
 *
 * Shape of the flow:
 *   1. An admin hits /api/canva/connect → Canva's consent screen.
 *   2. Canva redirects to /api/canva/callback with a code; we swap it for
 *      tokens and store the one connection row (lib/store.ts).
 *   3. The slide editor creates a blank 1920×1080 design and opens Canva's
 *      editor; when the artwork is ready it exports it (png or mp4) and pulls
 *      the file into public/uploads via /api/canva/exports.
 *
 * No client secret ships to the browser — every call here is server-side.
 * Tokens refresh on their own, ahead of expiry.
 */

const AUTHORIZE_URL = 'https://www.canva.com/api/oauth/authorize';
const TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';
const API = 'https://api.canva.com/rest/v1';

/**
 * design:content:write — create designs.
 * design:content:read  — export designs (png / mp4).
 * design:meta:read     — read a design's edit URL back.
 */
export const SCOPES = [
  'design:content:read',
  'design:content:write',
  'design:meta:read',
] as const;

const CLIENT_ID = process.env.CANVA_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET ?? '';
const REDIRECT_URI =
  process.env.CANVA_REDIRECT_URI ??
  'http://localhost:3000/api/canva/callback';

/** True once the three env vars are set — the UI hides Canva until then. */
export const isCanvaConfigured =
  CLIENT_ID.length > 0 && CLIENT_SECRET.length > 0;

export class CanvaError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'CanvaError';
    this.status = status;
  }
}

/* ----------------------------------------------------------------- oauth -- */

/** PKCE pair. The verifier rides in an httpOnly cookie until the callback. */
export function pkce(): {verifier: string; challenge: string} {
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return {verifier, challenge};
}

export function authorizeUrl(input: {
  state: string;
  challenge: string;
}): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
    code_challenge: input.challenge,
    code_challenge_method: 'S256',
    state: input.state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

function basicAuth(): string {
  return `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

function expiryFrom(expiresIn: number): string {
  // Refresh a minute early so a call never races the expiry.
  return new Date(Date.now() + (expiresIn - 60) * 1000).toISOString();
}

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = (await response.json().catch(() => ({}))) as
    | TokenResponse
    | {error?: string; error_description?: string};
  if (!response.ok || !('access_token' in data)) {
    const message =
      'error_description' in data && typeof data.error_description === 'string'
        ? data.error_description
        : 'Canva rejected the token request.';
    throw new CanvaError(message, response.status);
  }
  return data;
}

/** Callback: swap the authorization code for tokens and store them. */
export async function completeConnection(input: {
  code: string;
  verifier: string;
  adminId: string;
}): Promise<void> {
  const tokens = await tokenRequest(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code: input.code,
      code_verifier: input.verifier,
      redirect_uri: REDIRECT_URI,
    }),
  );
  await saveCanvaConnection({
    accessToken: seal(tokens.access_token),
    refreshToken: seal(tokens.refresh_token),
    expiresAt: expiryFrom(tokens.expires_in),
    connectedBy: input.adminId,
  });
}

/**
 * A usable access token, refreshing first if the stored one is close to
 * expiring. Throws if the panel was never connected.
 */
async function accessToken(): Promise<string> {
  const connection = await canvaConnection();
  if (connection === null) {
    throw new CanvaError('Canva is not connected.', 409);
  }

  if (new Date(connection.expiresAt).getTime() > Date.now()) {
    return open(connection.accessToken);
  }

  const tokens = await tokenRequest(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: open(connection.refreshToken),
    }),
  );
  await updateCanvaTokens({
    accessToken: seal(tokens.access_token),
    refreshToken: seal(tokens.refresh_token),
    expiresAt: expiryFrom(tokens.expires_in),
  });
  return tokens.access_token;
}

/* ------------------------------------------------------------------ api -- */

async function apiFetch<T>(
  path: string,
  init: {method?: string; body?: unknown} = {},
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      ...(init.body === undefined ? {} : {'Content-Type': 'application/json'}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = (await response.json().catch(() => ({}))) as
    | T
    | {message?: string};
  if (!response.ok) {
    const message =
      typeof (data as {message?: string}).message === 'string'
        ? (data as {message: string}).message
        : `Canva API error (${response.status}).`;
    throw new CanvaError(message, response.status);
  }
  return data as T;
}

export type CanvaDesign = {id: string; editUrl: string};

/** A blank design at 1920×1080 — TV resolution — ready to design on. */
export async function createTvDesign(title: string): Promise<CanvaDesign> {
  const data = await apiFetch<{
    design: {id: string; urls: {edit_url: string}};
  }>('/designs', {
    method: 'POST',
    body: {
      design_type: {type: 'custom', width: 1920, height: 1080},
      title,
    },
  });
  return {id: data.design.id, editUrl: data.design.urls.edit_url};
}

/** The current edit URL for a design already made here. */
export async function designEditUrl(designId: string): Promise<string> {
  const data = await apiFetch<{design: {urls: {edit_url: string}}}>(
    `/designs/${encodeURIComponent(designId)}`,
  );
  return data.design.urls.edit_url;
}

export type CanvaExportFormat = 'png' | 'mp4';

type ExportJob = {
  job: {id: string; status: string; urls?: string[]; error?: {message?: string}};
};

/**
 * Exports a design and waits for it, returning the download URLs Canva hands
 * back (one per page — a poster is a single page). The URLs are short-lived,
 * so the caller downloads immediately.
 */
export async function exportDesign(
  designId: string,
  format: CanvaExportFormat,
): Promise<string[]> {
  const started = await apiFetch<ExportJob>('/exports', {
    method: 'POST',
    body: {
      design_id: designId,
      format:
        format === 'png'
          ? {type: 'png', pages: [1]}
          : {type: 'mp4', quality: 'horizontal_1080p'},
    },
  });

  let job = started.job;
  for (let attempt = 0; attempt < 40 && job.status === 'in_progress'; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    const polled = await apiFetch<ExportJob>(
      `/exports/${encodeURIComponent(job.id)}`,
    );
    job = polled.job;
  }

  if (job.status !== 'success' || job.urls === undefined || job.urls.length === 0) {
    throw new CanvaError(
      job.error?.message ?? 'The Canva export did not finish.',
      502,
    );
  }
  return job.urls;
}

/* --------------------------------------------------------------- status -- */

export async function canvaStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  connectedBy: string | null;
}> {
  if (!isCanvaConfigured) {
    return {configured: false, connected: false, connectedBy: null};
  }
  const connection = await canvaConnection();
  return {
    configured: true,
    connected: connection !== null,
    connectedBy: connection?.connectedBy ?? null,
  };
}
