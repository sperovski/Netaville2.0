import Constants from 'expo-constants';

/**
 * Where the admin panel's API lives.
 *
 * In development the phone and the laptop are different machines, so
 * `localhost` is wrong on a real device — it means the phone. Metro already
 * knows the right address, because the app is loading its bundle over it, so
 * the host is taken from `hostUri` and only the port is swapped. That makes
 * the simulator and a device on the same Wi-Fi both work with no edit.
 *
 * `EXPO_PUBLIC_API_URL` overrides it, which is what a real deployment sets.
 */
const API_PORT = 3000;

function devHost(): string | null {
  // e.g. "192.168.100.184:8081" — the machine running Metro.
  const hostUri = Constants.expoConfig?.hostUri;
  if (typeof hostUri !== 'string' || hostUri.length === 0) {
    return null;
  }
  const host = hostUri.split('/')[0]?.split(':')[0];
  return host === undefined || host.length === 0 ? null : host;
}

function resolve(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (typeof configured === 'string' && configured.length > 0) {
    const base = configured.replace(/\/$/, '');
    // App Transport Security is on, so a release build cannot make a plain
    // http request at all — it fails with nothing but "could not reach
    // Netaville". Say so at startup instead of leaving it to be discovered
    // from TestFlight.
    if (!__DEV__ && !base.startsWith('https://')) {
      console.error(
        `[netaville] EXPO_PUBLIC_API_URL is "${base}". A release build needs ` +
          'https — iOS blocks cleartext requests and every call will fail.',
      );
    }
    return base;
  }

  const host = devHost();
  if (host !== null) {
    // Development: Metro told us which machine it is running on, and the panel
    // sits on the same one.
    return `http://${host}:${API_PORT}`;
  }

  // No Metro and nothing configured: a release build that was never pointed at
  // an API. Nothing here can work, so be loud rather than quietly timing out.
  if (!__DEV__) {
    console.error(
      '[netaville] EXPO_PUBLIC_API_URL is not set. This build has no API to ' +
        'talk to; set it and rebuild.',
    );
  }
  return `http://localhost:${API_PORT}`;
}

export const API_BASE_URL = resolve();
