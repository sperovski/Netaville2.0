/**
 * How long one QR code stays valid, in milliseconds.
 *
 * Its own module because both the panel and the mobile app have to agree on
 * it exactly — the app snaps its code to this interval and the panel divides
 * by it to check. A copy that drifts would reject every scan.
 */
export const STAMP_CODE_TTL_MS = 60_000;
