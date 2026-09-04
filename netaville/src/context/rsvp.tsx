import {createContext, useContext, useMemo, useState, type ReactNode} from 'react';
import {events as seedEvents, type NetavilleEvent} from '@/data/events';

type RsvpState = Record<string, 'going' | 'none'>;

type RsvpContextValue = {
  events: NetavilleEvent[];
  isGoing: (id: string) => boolean;
  goingCount: (id: string) => number;
  toggleRsvp: (id: string) => void;
};

const RsvpContext = createContext<RsvpContextValue | null>(null);

const seedState: RsvpState = Object.fromEntries(
  seedEvents.map(event => [event.id, event.rsvp]),
);

export function RsvpProvider({children}: {children: ReactNode}) {
  const [rsvps, setRsvps] = useState<RsvpState>(seedState);

  const value = useMemo<RsvpContextValue>(() => {
    const isGoing = (id: string) => rsvps[id] === 'going';

    return {
      events: seedEvents,
      isGoing,
      goingCount: id => {
        const event = seedEvents.find(candidate => candidate.id === id);
        if (!event) {
          return 0;
        }
        // The seed count already includes anyone marked as going in the data,
        // so only a change from the seed value shifts the number.
        const seeded = event.rsvp === 'going';
        const going = isGoing(id);
        if (seeded === going) {
          return event.attendeesGoing;
        }
        return going ? event.attendeesGoing + 1 : event.attendeesGoing - 1;
      },
      toggleRsvp: id =>
        setRsvps(current => ({
          ...current,
          [id]: current[id] === 'going' ? 'none' : 'going',
        })),
    };
  }, [rsvps]);

  return <RsvpContext.Provider value={value}>{children}</RsvpContext.Provider>;
}

export function useRsvp(): RsvpContextValue {
  const context = useContext(RsvpContext);
  if (context === null) {
    throw new Error('useRsvp must be used inside <RsvpProvider>');
  }
  return context;
}
