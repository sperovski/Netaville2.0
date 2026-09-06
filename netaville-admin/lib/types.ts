/**
 * The shared Netaville schema. The student mobile app and this admin panel
 * both read and write these shapes through /api/*, so a change here is a
 * change for both sides.
 */

export type Role = 'student' | 'admin';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  online: boolean;
  /** ISO timestamp of the last request we saw from them. */
  lastSeen: string;
  joinedAt: string;
  eventsAttended: number;
  rsvps: number;
  active: boolean;
};

export type RequestStatus = 'pending' | 'approved' | 'rejected';

/**
 * The short vocabulary of dietary requirements an organiser can tick.
 *
 * Fixed rather than free text so the kitchen can read a request at a glance
 * and the panel can filter on it; `foodNotes` carries anything that does not
 * fit, such as a specific allergy.
 */
export const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Halal',
  'Gluten-free',
  'Nut-free',
  'Lactose-free',
] as const;

export type Dietary = (typeof DIETARY_OPTIONS)[number];

/** One slot an organiser proposed. A request carries between one and four. */
export type RequestDate = {
  id: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  startTime: string;
  endTime: string;
};

export type EventRequest = {
  id: string;
  title: string;
  description: string;
  requesterId: string;
  /** What the organiser says it is; the admin can override on approval. */
  category: EventCategory;
  /** The slots that would work, best first. Never empty. */
  dates: RequestDate[];
  /** Which slot the admin picked. Set on approval. */
  chosenDateId?: string;
  room: string;
  catering: string;
  dietary: Dietary[];
  foodNotes: string;
  expectedParticipants: number;
  status: RequestStatus;
  /** Why it was rejected; only set on rejection. */
  reason?: string;
  submittedAt: string;
};

export type EventCategory =
  'Workshop' | 'Social' | 'Talk' | 'Quiz' | 'Community' | 'Private';

export type NetavilleEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  category: EventCategory;
  /** Free text, e.g. "Free" or "150 ден". */
  priceInfo: string;
  /** Percentage off in the cafeteria for attendees, 0–100. */
  cafeteriaDiscount: number;
  catering: string;
  /** Carried through from the request, so the kitchen reads it off the event. */
  dietary: Dietary[];
  foodNotes: string;
  /** Whether drinks are laid on. */
  drinks: boolean;
  /** Who may come, e.g. "Open to all" or "Invite only". */
  openTo: string;
  published: boolean;
  /** Set when the event was created by approving a request. */
  fromRequestId?: string;
};

export type RsvpState = 'going' | 'maybe' | 'none';

/** One student's answer to one event. Absent means 'none'. */
export type Rsvp = {
  eventId: string;
  userId: string;
  state: Exclude<RsvpState, 'none'>;
  at: string;
};

/** How a wall renders. 'auto' follows the clock — light by day, dark at night. */
export type ScreenTheme = 'light' | 'dark' | 'auto';

export type Screen = {
  id: string;
  name: string;
  location: string;
  theme: ScreenTheme;
  /** Six digits the TV shows until an admin claims it. */
  pairingCode: string;
  paired: boolean;
  online: boolean;
  lastSeen: string;
  activePlaylistId: string | null;
};

/**
 * 'upcoming' is the events board — it draws the next few published events
 * rather than fixed artwork, so a rotation is built by interleaving it with
 * commercials and stays current without anyone re-cutting a slide.
 */
export type SlideType = 'poster' | 'announcement' | 'marketing' | 'upcoming';

export type Slide = {
  id: string;
  type: SlideType;
  /** poster + marketing. */
  imageUrl?: string;
  /** announcement: the event it is built from. */
  eventId?: string;
  headline?: string;
  cta?: string;
  /** upcoming: how many events the board shows at once. */
  eventLimit?: number;
  durationSec: number;
  enabled: boolean;
  /** Optional window, ISO date-times. Outside it the slide is skipped. */
  startAt?: string;
  endAt?: string;
};

export type Playlist = {
  id: string;
  screenId: string;
  name: string;
  slides: Slide[];
  /** True once an admin has pushed it to the TV. */
  active: boolean;
  updatedAt: string;
};

/** Stamps on a full card. Reaching it converts to one free coffee. */
export const STAMPS_PER_REWARD = 10;

/** One student's loyalty card. */
export type StampCard = {
  userId: string;
  /** On the current card, always below STAMPS_PER_REWARD at rest. */
  stamps: number;
  lifetimeStamps: number;
  /** Free coffees banked and not yet drunk. */
  rewards: number;
  coffeesRedeemed: number;
  updatedAt: string;
};

export type StampEventKind = 'stamp' | 'unstamp' | 'reward' | 'redeem';

/** One line of a card's history, as the counter screen lists it. */
export type StampEvent = {
  id: string;
  userId: string;
  kind: StampEventKind;
  delta: number;
  /** The admin who did it, already looked up. */
  actor: string | null;
  note: string;
  at: string;
};

/** What the counter screen shows after a scan: who, their card, what changed. */
export type CounterView = {
  student: Pick<User, 'id' | 'name' | 'email' | 'active'>;
  card: StampCard;
  history: StampEvent[];
};

export type ActivityKind =
  'request' | 'approval' | 'rejection' | 'event' | 'screen' | 'auth';

export type Activity = {
  id: string;
  kind: ActivityKind;
  message: string;
  at: string;
};

/** What /screen/[id] polls for: everything the TV needs in one payload. */
export type ScreenFeed = {
  screen: Pick<Screen, 'id' | 'name' | 'paired' | 'pairingCode' | 'theme'>;
  playlist: {
    id: string;
    updatedAt: string;
    slides: ResolvedSlide[];
  } | null;
};

/** What the board shows for one event. */
export type BoardEvent = Pick<
  NetavilleEvent,
  'id' | 'title' | 'date' | 'startTime' | 'endTime' | 'room' | 'category'
>;

/**
 * A slide with its data already looked up, so the TV renders plain data and
 * never queries anything itself.
 */
export type ResolvedSlide = Slide & {
  /** announcement: the single event it is built from. */
  event?: BoardEvent;
  /** upcoming: the events the board lists, soonest first. */
  events?: BoardEvent[];
};

/**
 * What the student app renders, assembled by lib/appFeed.ts.
 *
 * Deliberately not the raw NetavilleEvent: the app needs the duration already
 * worded, the attendee counts already tallied and this student's own answer
 * folded in — all of which depend on who is asking. Keeping that on the server
 * means the phone renders plain data and never recomputes it.
 */
export type AppEvent = {
  id: string;
  title: string;
  /** Calendar day, ISO `YYYY-MM-DD`. */
  isoDate: string;
  startTime: string;
  endTime: string;
  durationLabel: string;
  room: string;
  category: EventCategory;
  /** This student's own answer. */
  rsvp: 'going' | 'none';
  attendeesGoing: number;
  attendeesMaybe: number;
  description: string;
  catering: boolean;
  drinks: boolean;
  openTo: string;
};
