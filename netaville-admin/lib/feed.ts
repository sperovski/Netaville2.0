import {activePlaylistFor, listUpcomingEvents, touchScreen} from './store';
import type {
  BoardEvent,
  NetavilleEvent,
  ResolvedSlide,
  ScreenFeed,
} from './types';

/** How many events the board will ever draw, whatever a slide asks for. */
const MAX_BOARD_EVENTS = 12;

function toBoardEvent(event: NetavilleEvent): BoardEvent {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    room: event.room,
    category: event.category,
  };
}

/**
 * Builds the TV payload. Shared by the API route and the server render of
 * /screen/[id], so the first paint needs no round trip.
 *
 * Everything a slide needs is resolved here — the announcement's event, the
 * board's list — so the wall renders plain data and never queries anything
 * itself. A TV that has to fetch is a TV that shows a spinner when the Wi-Fi
 * drops.
 */
export async function buildScreenFeed(
  screenId: string,
): Promise<ScreenFeed | null> {
  const screen = await touchScreen(screenId);
  if (screen === null) {
    return null;
  }

  const playlist = await activePlaylistFor(screenId);
  const now = Date.now();

  const enabled = (playlist?.slides ?? [])
    .filter(slide => slide.enabled)
    // A scheduled slide only plays inside its window.
    .filter(slide => {
      const startsOk =
        slide.startAt === undefined || new Date(slide.startAt).getTime() <= now;
      const endsOk =
        slide.endAt === undefined || new Date(slide.endAt).getTime() >= now;
      return startsOk && endsOk;
    });

  // One read for the whole rotation, and only when something needs it.
  const needsEvents = enabled.some(
    slide => slide.type === 'announcement' || slide.type === 'upcoming',
  );
  const upcoming = needsEvents ? await listUpcomingEvents() : [];
  const byId = new Map(upcoming.map(event => [event.id, event]));

  const slides: ResolvedSlide[] = enabled
    .map((slide): ResolvedSlide => {
      if (slide.type === 'upcoming') {
        const limit = Math.min(slide.eventLimit ?? 5, MAX_BOARD_EVENTS);
        return {...slide, events: upcoming.slice(0, limit).map(toBoardEvent)};
      }
      if (slide.type !== 'announcement' || slide.eventId === undefined) {
        return slide;
      }
      const event = byId.get(slide.eventId);
      return event === undefined
        ? slide
        : {...slide, event: toBoardEvent(event)};
    })
    // An announcement whose event vanished, was unpublished or has passed has
    // nothing to show; an empty board is a blank wall, so it is skipped too.
    .filter(slide => {
      if (slide.type === 'announcement') {
        return slide.event !== undefined;
      }
      if (slide.type === 'upcoming') {
        return (slide.events?.length ?? 0) > 0;
      }
      return true;
    });

  return {
    screen: {
      id: screen.id,
      name: screen.name,
      paired: screen.paired,
      pairingCode: screen.pairingCode,
      theme: screen.theme,
    },
    playlist:
      playlist === null
        ? null
        : {id: playlist.id, updatedAt: playlist.updatedAt, slides},
  };
}
