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

export type EventRequest = {
  id: string;
  title: string;
  requesterId: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  catering: string;
  expectedParticipants: number;
  status: RequestStatus;
  /** Why it was rejected; only set on rejection. */
  reason?: string;
  submittedAt: string;
};

export type EventCategory =
  | 'Workshop'
  | 'Social'
  | 'Talk'
  | 'Quiz'
  | 'Community';

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
  published: boolean;
  /** Set when the event was created by approving a request. */
  fromRequestId?: string;
};

export type Screen = {
  id: string;
  name: string;
  location: string;
  /** Six digits the TV shows until an admin claims it. */
  pairingCode: string;
  paired: boolean;
  online: boolean;
  lastSeen: string;
  activePlaylistId: string | null;
};

export type SlideType = 'poster' | 'announcement' | 'marketing';

export type Slide = {
  id: string;
  type: SlideType;
  /** poster + marketing. */
  imageUrl?: string;
  /** announcement: the event it is built from. */
  eventId?: string;
  headline?: string;
  cta?: string;
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

export type ActivityKind =
  | 'request'
  | 'approval'
  | 'rejection'
  | 'event'
  | 'screen'
  | 'auth';

export type Activity = {
  id: string;
  kind: ActivityKind;
  message: string;
  at: string;
};

/** What /screen/[id] polls for: everything the TV needs in one payload. */
export type ScreenFeed = {
  screen: Pick<Screen, 'id' | 'name' | 'paired' | 'pairingCode'>;
  playlist: {
    id: string;
    updatedAt: string;
    slides: ResolvedSlide[];
  } | null;
};

/** A slide with its event already looked up, so the TV renders plain data. */
export type ResolvedSlide = Slide & {
  event?: Pick<
    NetavilleEvent,
    'title' | 'date' | 'startTime' | 'endTime' | 'room' | 'category'
  >;
};
