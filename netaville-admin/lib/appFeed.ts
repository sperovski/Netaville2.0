import {
  eventById,
  goingEventIds,
  listPublishedEvents,
  rsvpTallies,
  type RsvpCounts,
} from './store';
import type {AppEvent, NetavilleEvent} from './types';

/** "3h", "1h 30m", "45m" — how long the event runs, worded for a stat tile. */
export function durationLabel(startTime: string, endTime: string): string {
  const minutes = toMinutes(endTime) - toMinutes(startTime);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return '—';
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) {
    return `${rest}m`;
  }
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours ?? NaN) * 60 + (minutes ?? 0);
}

/**
 * One published event as the app renders it, from the point of view of one
 * student: counts tallied from the RSVP table, their own answer folded in.
 *
 * The tallies and this student's answers are passed in rather than fetched,
 * so building a feed of N events stays two queries instead of 2N.
 */
function render(
  event: NetavilleEvent,
  counts: RsvpCounts | undefined,
  going: ReadonlySet<string>,
): AppEvent {
  return {
    id: event.id,
    title: event.title,
    isoDate: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    durationLabel: durationLabel(event.startTime, event.endTime),
    room: event.room,
    category: event.category,
    rsvp: going.has(event.id) ? 'going' : 'none',
    attendeesGoing: counts?.going ?? 0,
    attendeesMaybe: counts?.maybe ?? 0,
    description: event.description,
    // The panel stores what the catering is; the app only shows whether there
    // is any, so "None" is the one value that reads as false.
    catering: event.catering.trim().toLowerCase() !== 'none',
    drinks: event.drinks,
    openTo: event.openTo,
  };
}

/** One event as this student sees it, or null if it is gone or unpublished. */
export async function toAppEvent(
  eventId: string,
  userId: string,
): Promise<AppEvent | null> {
  const event = await eventById(eventId);
  if (event === null || !event.published) {
    return null;
  }
  const [tallies, going] = await Promise.all([
    rsvpTallies(),
    goingEventIds(userId),
  ]);
  return render(event, tallies.get(event.id), going);
}

/** The whole published feed, soonest first. */
export async function appFeed(userId: string): Promise<AppEvent[]> {
  const [events, tallies, going] = await Promise.all([
    listPublishedEvents(),
    rsvpTallies(),
    goingEventIds(userId),
  ]);
  return events.map(event => render(event, tallies.get(event.id), going));
}
