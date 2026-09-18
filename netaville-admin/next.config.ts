import type {NextConfig} from 'next';

/**
 * Response headers the browser enforces for us.
 *
 * These cost nothing and close off whole classes of attack that no amount of
 * care in the route handlers can: the panel being framed by another site, a
 * response being sniffed into a different content type, referrers leaking
 * paths to third parties.
 */
const securityHeaders = [
  // The panel is never legitimately embedded. `frame-ancestors` is the modern
  // control and X-Frame-Options is the fallback for anything predating it.
  {key: 'Content-Security-Policy', value: "frame-ancestors 'none'"},
  {key: 'X-Frame-Options', value: 'DENY'},
  // Take the declared Content-Type at face value; do not guess. This is what
  // stops a response being re-interpreted as script.
  {key: 'X-Content-Type-Options', value: 'nosniff'},
  // Send the origin cross-site, the full path only to ourselves.
  {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
  // Nothing here needs any of these; refuse them rather than inherit defaults.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Ignored over plain http, so it is safe to send unconditionally and it is
  // already correct the moment the panel is served over TLS.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
];

/**
 * Uploaded files are served from the same origin as the panel, which makes an
 * SVG — a document format that can carry script — a stored-XSS vector the
 * moment someone opens one directly.
 *
 * `sandbox` with no allow-list drops the file into an opaque origin with no
 * scripting, so an embedded `<img src="/uploads/…">` still renders while
 * navigating to the file itself can do nothing.
 */
const uploadHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  },
  {key: 'X-Content-Type-Options', value: 'nosniff'},
];

const nextConfig: NextConfig = {
  // The repo also holds the mobile app's lockfile; point Turbopack at this app
  // so it stops guessing the workspace root.
  turbopack: {root: __dirname},

  async headers() {
    return [
      {source: '/:path*', headers: securityHeaders},
      {source: '/uploads/:path*', headers: uploadHeaders},
    ];
  },
};

export default nextConfig;
