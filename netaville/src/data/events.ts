export type EventCategory = 'Workshop' | 'Social' | 'Quiz' | 'Private';

export type NetavilleEvent = {
  id: string;
  title: string;
  /** Calendar day, ISO `YYYY-MM-DD`. The display label is derived from it. */
  isoDate: string;
  startTime: string;
  endTime: string;
  durationLabel: string;
  room: string;
  category: EventCategory;
  rsvp: 'going' | 'none';
  attendeesGoing: number;
  attendeesMaybe: number;
  description: string;
  catering: boolean;
  drinks: boolean;
  openTo: string;
};

export const events: NetavilleEvent[] = [
  {
    id: 'cursor-community-build',
    title: 'Cursor community build event',
    isoDate: '2026-09-04',
    startTime: '18:00',
    endTime: '21:00',
    durationLabel: '3h',
    room: 'Amphitheatre',
    category: 'Workshop',
    rsvp: 'none',
    attendeesGoing: 24,
    attendeesMaybe: 6,
    description:
      'Bring a laptop and an idea. We pair up, build something small with Cursor in a single sitting, and demo it at the end. Beginners welcome — we start with a short walkthrough before the build block.',
    catering: true,
    drinks: true,
    openTo: 'Open to all',
  },
  {
    id: 'iskustva-quiz-night',
    title: 'Iskustva.mk Quiz Night',
    isoDate: '2026-09-11',
    startTime: '19:00',
    endTime: '21:00',
    durationLabel: '2h',
    room: 'Amphitheatre',
    category: 'Quiz',
    rsvp: 'going',
    attendeesGoing: 38,
    attendeesMaybe: 11,
    description:
      'Teams of up to five, six rounds, one very opinionated host. Tech trivia mixed with general knowledge — no preparation needed, just show up with a team name.',
    catering: false,
    drinks: true,
    openTo: 'Open to all',
  },
  {
    id: 'game-night-energet',
    title: 'Game night — Енергет',
    isoDate: '2026-09-12',
    startTime: '20:00',
    endTime: '22:00',
    durationLabel: '2h',
    room: 'Classroom',
    category: 'Social',
    rsvp: 'none',
    attendeesGoing: 17,
    attendeesMaybe: 4,
    description:
      'Board games, card games and a projector running whatever tournament breaks out. Bring your own games if you have a favourite.',
    catering: false,
    drinks: true,
    openTo: 'Open to all',
  },
  {
    id: 'typescript-patterns-workshop',
    title: 'TypeScript patterns workshop',
    isoDate: '2026-09-15',
    startTime: '18:30',
    endTime: '20:30',
    durationLabel: '2h',
    room: 'Classroom',
    category: 'Workshop',
    rsvp: 'none',
    attendeesGoing: 21,
    attendeesMaybe: 9,
    description:
      'A hands-on session on the type-level patterns that carry real codebases: discriminated unions, branded types, and inference that works with you instead of against you.',
    catering: true,
    drinks: false,
    openTo: 'Open to all',
  },
  {
    id: 'private-event-sep-17',
    title: 'Private event',
    isoDate: '2026-09-17',
    startTime: '17:00',
    endTime: '20:00',
    durationLabel: '3h',
    room: 'Amphitheatre',
    category: 'Private',
    rsvp: 'none',
    attendeesGoing: 0,
    attendeesMaybe: 0,
    description: 'This slot is booked for a private booking. The space is closed to drop-ins.',
    catering: false,
    drinks: false,
    openTo: 'Invite only',
  },
  {
    id: 'community-coffee',
    title: 'Community coffee & demos',
    isoDate: '2026-09-20',
    startTime: '10:30',
    endTime: '12:00',
    durationLabel: '1h 30m',
    room: 'Cafeteria',
    category: 'Social',
    rsvp: 'going',
    attendeesGoing: 12,
    attendeesMaybe: 5,
    description:
      'Slow Saturday morning format. Coffee, five-minute demos of whatever people are building, and no slides allowed.',
    catering: false,
    drinks: true,
    openTo: 'Open to all',
  },
  {
    id: 'private-event-sep-24',
    title: 'Private event',
    isoDate: '2026-09-24',
    startTime: '18:00',
    endTime: '21:00',
    durationLabel: '3h',
    room: 'Classroom',
    category: 'Private',
    rsvp: 'none',
    attendeesGoing: 0,
    attendeesMaybe: 0,
    description: 'This slot is booked for a private booking. The space is closed to drop-ins.',
    catering: false,
    drinks: false,
    openTo: 'Invite only',
  },
];

export function getEventById(id: string): NetavilleEvent | undefined {
  return events.find(event => event.id === id);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** Parsed as local midnight, so day arithmetic never slips a timezone. */
export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/** "Today" for the current day, otherwise "Fri 11 Sep". */
export function formatEventDate(iso: string): string {
  if (iso === todayIso()) {
    return 'Today';
  }
  const date = parseIsoDate(iso);
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function formatMonth(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function isEventToday(event: NetavilleEvent): boolean {
  return event.isoDate === todayIso();
}

/** Within the next seven days, today included. */
export function isThisWeek(event: NetavilleEvent): boolean {
  const start = parseIsoDate(todayIso()).getTime();
  const day = parseIsoDate(event.isoDate).getTime();
  const week = 7 * 24 * 60 * 60 * 1000;
  return day >= start && day < start + week;
}

export function eventsOn(iso: string): NetavilleEvent[] {
  return events.filter(event => event.isoDate === iso);
}

const LONG_WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const;
const LONG_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** "Friday 4 September" — the long form used on the detail screen. */
export function formatLongDate(iso: string): string {
  const date = parseIsoDate(iso);
  return `${LONG_WEEKDAYS[date.getDay()]} ${date.getDate()} ${LONG_MONTHS[date.getMonth()]}`;
}
