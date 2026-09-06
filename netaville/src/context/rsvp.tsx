import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {useAuth} from '@/context/auth';
import {
  ApiError,
  fetchEvents,
  isOffline,
  putRsvp,
  type ApiEvent,
} from '@/lib/api';
import {
  events as fallbackEvents,
  type EventCategory,
  type NetavilleEvent,
} from '@/data/events';

/**
 * The events feed, live from the admin panel.
 *
 * RSVPs are written straight through and applied optimistically: the tap has to
 * feel instant, so the card flips first and rolls back if the server refuses.
 * A rollback always comes with a reason — a silent revert is indistinguishable
 * from a button that does nothing, which is exactly how it reads.
 *
 * When the panel is unreachable the bundled fixture stands in, flagged through
 * `stale` so the screen can say so rather than pretending it is current. RSVPs
 * are refused outright while stale: those events are bundled placeholders the
 * server has never heard of, so writing one could only ever fail.
 */

type Status = 'loading' | 'ready' | 'error';

type RsvpContextValue = {
  events: NetavilleEvent[];
  status: Status;
  /** Set when the last load failed; the feed then falls back to the fixture. */
  error: string | null;
  /** True while showing bundled data because the panel could not be reached. */
  stale: boolean;
  refresh: () => Promise<void>;
  isGoing: (id: string) => boolean;
  goingCount: (id: string) => number;
  /**
   * Sets this student's answer. Resolves to what happened, so the screen can
   * say why nothing moved instead of leaving the tap looking ignored.
   */
  setGoing: (id: string, going: boolean) => Promise<RsvpResult>;
};

export type RsvpResult = {ok: true} | {ok: false; message: string};

const RsvpContext = createContext<RsvpContextValue | null>(null);

const categories: readonly EventCategory[] = [
  'Workshop',
  'Social',
  'Talk',
  'Quiz',
  'Community',
  'Private',
];

/** Trusts the server's shape but not its category, which the app switches on. */
function toEvent(event: ApiEvent): NetavilleEvent {
  const category = categories.includes(event.category as EventCategory)
    ? (event.category as EventCategory)
    : 'Community';
  return {...event, category};
}

export function RsvpProvider({children}: {children: ReactNode}) {
  const {user, status: authStatus, signOut} = useAuth();
  const [events, setEvents] = useState<NetavilleEvent[]>(fallbackEvents);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  // Guards against a slow response from a previous account landing after a
  // faster one for the current account.
  const loadId = useRef(0);

  const load = useCallback(async () => {
    if (user === null) {
      return;
    }
    const id = ++loadId.current;
    setStatus(current => (current === 'ready' ? current : 'loading'));
    try {
      const {events: fetched} = await fetchEvents(user);
      if (id !== loadId.current) {
        return;
      }
      setEvents(fetched.map(toEvent));
      setStale(false);
      setError(null);
      setStatus('ready');
    } catch (caught) {
      if (id !== loadId.current) {
        return;
      }
      // A refused account means the stored session is no longer one the server
      // will accept — most often one written before the app moved to UKIM
      // sign-in. Falling back to the fixture would strand them in a signed-in
      // app that can never write anything, so end the session instead.
      if (
        caught instanceof ApiError &&
        (caught.status === 401 || caught.status === 403)
      ) {
        void signOut();
        return;
      }
      // The fixture is already in state, so an unreachable panel degrades to
      // stale-but-usable rather than to an empty screen.
      setStale(true);
      setError(
        isOffline(caught)
          ? 'Showing saved events — Netaville is out of reach.'
          : caught instanceof Error
            ? caught.message
            : 'Could not load events.',
      );
      setStatus('error');
    }
  }, [user, signOut]);

  useEffect(() => {
    if (authStatus === 'signedIn') {
      void load();
    }
  }, [authStatus, load]);

  const value = useMemo<RsvpContextValue>(() => {
    const isGoing = (id: string) =>
      events.find(event => event.id === id)?.rsvp === 'going';

    return {
      events,
      status,
      error,
      stale,
      refresh: load,
      isGoing,
      goingCount: id =>
        events.find(event => event.id === id)?.attendeesGoing ?? 0,

      setGoing: async (id, going) => {
        const current = events.find(event => event.id === id);
        if (current === undefined || user === null) {
          return {ok: false, message: 'Sign in again to RSVP.'};
        }
        // Bundled events only exist on this phone. Writing one would 404, so
        // say why rather than flashing the button and putting it back.
        if (stale) {
          return {
            ok: false,
            message:
              'These are saved events — Netaville is out of reach, so your RSVP cannot be sent yet.',
          };
        }
        if (current.rsvp === (going ? 'going' : 'none')) {
          return {ok: true};
        }

        const apply = (event: NetavilleEvent): NetavilleEvent => ({
          ...event,
          rsvp: going ? 'going' : 'none',
          attendeesGoing: Math.max(0, event.attendeesGoing + (going ? 1 : -1)),
        });
        setEvents(list =>
          list.map(event => (event.id === id ? apply(event) : event)),
        );

        try {
          const {event} = await putRsvp(user, id, going);
          // Replace with the server's tally, which counts everyone rather
          // than guessing from one device.
          setEvents(list =>
            list.map(item => (item.id === id ? toEvent(event) : item)),
          );
          return {ok: true};
        } catch (caught) {
          setEvents(list =>
            list.map(item => (item.id === id ? current : item)),
          );

          // A refused account is not a failed RSVP, it is a dead session —
          // most often one stored before the app moved to UKIM sign-in. Ending
          // it puts the student on the sign-in screen, which is the only place
          // they can do anything about it.
          if (
            caught instanceof ApiError &&
            (caught.status === 401 || caught.status === 403)
          ) {
            void signOut();
            return {ok: false, message: caught.message};
          }

          return {
            ok: false,
            message: isOffline(caught)
              ? 'Could not reach Netaville. Check your connection and try again.'
              : caught instanceof Error
                ? caught.message
                : 'Could not save your RSVP. Try again.',
          };
        }
      },
    };
  }, [events, status, error, stale, load, user, signOut]);

  return <RsvpContext.Provider value={value}>{children}</RsvpContext.Provider>;
}

export function useRsvp(): RsvpContextValue {
  const context = useContext(RsvpContext);
  if (context === null) {
    throw new Error('useRsvp must be used inside <RsvpProvider>');
  }
  return context;
}
