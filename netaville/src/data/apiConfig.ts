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
    return configured.replace(/\/$/, '');
  }
  const host = devHost();
  // No Metro host means a release build with nothing configured; localhost at
  // least fails fast and locally rather than pointing somewhere unexpected.
  return `http://${host ?? 'localhost'}:${API_PORT}`;
}

export const API_BASE_URL = resolve();
