/**
 * Reading the QR code on a student's card.
 *
 * The app draws `netaville://stamp?v=1&u=<id>&w=<window>`, where the window is
 * the minute the code was made for. Checking it here is what makes the
 * rotation mean something: a screenshot forwarded to a friend is refused,
 * because the window it carries has passed.
 *
 * This is deliberately not a signature and does not pretend to be one. It
 * raises the cost of the realistic abuse — passing a picture around — and
 * nothing more. A forged code is still possible for anyone who reads this
 * file, which is why the scan is an admin-only action performed by staff who
 * are looking at the person in front of them.
 */
import {STAMP_CODE_TTL_MS} from './stampWindow';

export type ScanResult =
  {ok: true; userId: string} | {ok: false; reason: 'malformed' | 'expired'};

/**
 * How many windows either side of now still count.
 *
 * One, which is up to two minutes of slack. Phone clocks drift and a code
 * shown at the till is read a moment later; refusing a student whose phone is
 * forty seconds fast would be a worse failure than the one being prevented.
 */
const WINDOW_SLACK = 1;

export function readStampCode(code: string, now = Date.now()): ScanResult {
  let url: URL;
  try {
    url = new URL(code.trim());
  } catch {
    return {ok: false, reason: 'malformed'};
  }

  if (url.protocol !== 'netaville:' || !url.href.includes('stamp')) {
    return {ok: false, reason: 'malformed'};
  }

  const userId = url.searchParams.get('u');
  const window = Number(url.searchParams.get('w'));
  if (
    url.searchParams.get('v') !== '1' ||
    userId === null ||
    userId.length === 0 ||
    !Number.isFinite(window)
  ) {
    return {ok: false, reason: 'malformed'};
  }

  const current = Math.floor(now / STAMP_CODE_TTL_MS);
  if (Math.abs(current - window) > WINDOW_SLACK) {
    return {ok: false, reason: 'expired'};
  }

  return {ok: true, userId};
}
