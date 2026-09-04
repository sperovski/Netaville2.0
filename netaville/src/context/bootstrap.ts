/**
 * Cold-start work that has to finish before the app is usable: auth check,
 * remote config, and the first events fetch. All local for now — swap the
 * bodies for real calls and the splash timing keeps working.
 */
export async function bootstrapApp(): Promise<void> {
  await Promise.all([checkAuth(), loadConfig(), prefetchEvents()]);
}

const settle = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function checkAuth(): Promise<void> {
  await settle(180);
}

async function loadConfig(): Promise<void> {
  await settle(240);
}

async function prefetchEvents(): Promise<void> {
  await settle(420);
}
