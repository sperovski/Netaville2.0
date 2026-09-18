import {NextResponse} from 'next/server';
import {rateLimit} from '@/lib/rateLimit';
import {enrollScreen, newPairingCode} from '@/lib/store';
import {hashToken, newDeviceToken} from '@/lib/tvToken';

/**
 * A TV opened /tv for the first time and needs an identity.
 *
 * Unauthenticated on purpose — there is no credential to present yet, that is
 * the point of this call. It creates an unclaimed screen, hands back a device
 * token (kept only as its hash) and a six-digit pairing code, and the device
 * stores the token forever. An admin then claims the screen by typing the code
 * into the panel.
 *
 * Rate-limited by IP. A legitimate wall enrols once in its life, but a whole
 * building of them can share one public address and a setup session reboots a
 * screen several times — so the ceiling is loose enough for that and still far
 * below anything that looks like someone filling the table with junk.
 */

type Body = {
  /** Free-form diagnostics the device volunteers — UA, viewport, app version. */
  device?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const limited = rateLimit(request, 'tv-enroll', {limit: 30, windowSeconds: 3600});
  if (limited !== null) {
    return limited;
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const device =
    body.device !== null && typeof body.device === 'object' ? body.device : {};

  const token = newDeviceToken();
  const screen = await enrollScreen({
    tokenHash: hashToken(token),
    pairingCode: await newPairingCode(),
    // Bound the blob so a device cannot push megabytes into the row.
    deviceInfo: clampInfo(device),
  });

  return NextResponse.json(
    {
      deviceToken: token,
      pairingCode: screen.pairingCode,
      screenId: screen.id,
    },
    {status: 201},
  );
}

/** Keeps only short string/number/boolean fields, capped in size. */
function clampInfo(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let kept = 0;
  for (const [key, value] of Object.entries(input)) {
    if (kept >= 20 || key.length > 40) {
      continue;
    }
    if (typeof value === 'string') {
      out[key] = value.slice(0, 400);
      kept += 1;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
      kept += 1;
    }
  }
  return out;
}
