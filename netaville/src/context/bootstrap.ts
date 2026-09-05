/**
 * Cold-start work that has to finish before the app is usable: remote config
 * and the first events fetch. Still local — swap the bodies for real calls and
 * the splash timing keeps working. The session lookup lives in AuthProvider
 * (src/context/auth.tsx); the splash waits on that separately.
 */
export async function bootstrapApp(): Promise<void> {
  await Promise.all([loadConfig(), prefetchEvents()]);
}

const settle = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function loadConfig(): Promise<void> {
  await settle(240);
}

async function prefetchEvents(): Promise<void> {
  await settle(420);
}
