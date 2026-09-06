/**
 * Cold-start work that has to finish before the app is usable.
 *
 * The events prefetch used to live here. It moved into RsvpProvider
 * (src/context/rsvp.tsx) once the feed became a real request: it needs the
 * signed-in account to know whose RSVPs to send back, and the events screen
 * carries its own spinner, so holding the splash on it only made launch slower.
 * Remote config is still local — swap the body for a real call and the splash
 * timing keeps working.
 */
export async function bootstrapApp(): Promise<void> {
  await loadConfig();
}

const settle = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function loadConfig(): Promise<void> {
  await settle(240);
}
