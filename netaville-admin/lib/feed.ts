import {activePlaylistFor, db, touchScreen} from './store';
import type {ResolvedSlide, ScreenFeed} from './types';

/**
 * Builds the TV payload. Shared by the API route and the server render of
 * /screen/[id], so the first paint needs no round trip.
 */
export function buildScreenFeed(screenId: string): ScreenFeed | null {
  const screen = touchScreen(screenId);
  if (screen === undefined) {
    return null;
  }

  const playlist = activePlaylistFor(screenId);
  const now = Date.now();

  const slides: ResolvedSlide[] = (playlist?.slides ?? [])
    .filter(slide => slide.enabled)
    // A scheduled slide only plays inside its window.
    .filter(slide => {
      const startsOk =
        slide.startAt === undefined || new Date(slide.startAt).getTime() <= now;
      const endsOk =
        slide.endAt === undefined || new Date(slide.endAt).getTime() >= now;
      return startsOk && endsOk;
    })
    .map((slide): ResolvedSlide => {
      if (slide.type !== 'announcement' || slide.eventId === undefined) {
        return slide;
      }
      const event = db.events.find(candidate => candidate.id === slide.eventId);
      if (event === undefined) {
        return slide;
      }
      return {
        ...slide,
        event: {
          title: event.title,
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          room: event.room,
          category: event.category,
        },
      };
    })
    // An announcement whose event vanished has nothing to show.
    .filter(slide => slide.type !== 'announcement' || slide.event !== undefined);

  return {
    screen: {
      id: screen.id,
      name: screen.name,
      paired: screen.paired,
      pairingCode: screen.pairingCode,
    },
    playlist:
      playlist === undefined
        ? null
        : {id: playlist.id, updatedAt: playlist.updatedAt, slides},
  };
}
