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
import {AppState} from 'react-native';
import {useAuth} from '@/context/auth';
import {ApiError, fetchCard, redeemCoffee, type ApiLeaderboardEntry} from '@/lib/api';
import {
  STAMPS_PER_REWARD,
  seedFriends,
  seedRequests,
  type Friend,
  type FriendRequest,
  type LeaderboardEntry,
} from '@/data/loyalty';

/**
 * The loyalty card, read from the server.
 *
 * The numbers here are the row the counter writes to — scan a card at the till
 * and the phone shows it on the next poll. It used to be `useState` seed values
 * invented on the phone, which looked convincing, reset on every launch and
 * agreed with nothing.
 *
 * Friends are still local fixtures: there is no friends table yet, and the
 * screens that draw them say so. Everything on the Card and Ranks tabs is real.
 */

export type Notification = {
  id: string;
  title: string;
  body: string;
};

/** Re-exported so screens keep importing the one shape they always used. */
export type {LeaderboardEntry} from '@/data/loyalty';

type Status = 'loading' | 'ready' | 'error';

type LoyaltyContextValue = {
  /** Stamps on the current card, below STAMPS_PER_REWARD at rest. */
  stamps: number;
  lifetimeStamps: number;
  /** Free coffees banked in the rewards wallet. */
  rewards: number;
  coffeesRedeemed: number;
  /** How the card load went; the Card tab shows a spinner on the first one. */
  status: Status;
  error: string | null;
  refresh: () => Promise<void>;
  /**
   * True only for a verified UKIM student — it follows the signed-in account
   * (see context/auth), not a setting. It gates the student price on the menu.
   */
  isStudent: boolean;
  friends: Friend[];
  requests: FriendRequest[];
  notifications: Notification[];
  leaderboard: LeaderboardEntry[];
  /** Position on the board, or null when this account is not on it. */
  rank: number | null;
  /**
   * True from the moment a card fills until the celebration is dismissed. The
   * root layout renders <RewardUnlockedCard> off this, so a full card is
   * announced wherever the person happens to be in the app.
   */
  rewardUnlocked: boolean;
  dismissRewardUnlocked: () => void;
  redeemReward: () => Promise<void>;
  giftReward: (friendId: string) => void;
  acceptRequest: (id: string) => void;
  declineRequest: (id: string) => void;
  removeFriend: (id: string) => void;
  sendRequest: (displayName: string) => void;
  clearNotifications: () => void;
};

const LoyaltyContext = createContext<LoyaltyContextValue | null>(null);

/** How often the card re-reads itself while the app is in front. */
const POLL_MS = 30_000;

const EMPTY = {
  stamps: 0,
  lifetimeStamps: 0,
  rewards: 0,
  coffeesRedeemed: 0,
};

export function LoyaltyProvider({children}: {children: ReactNode}) {
  const {user, status: authStatus} = useAuth();
  const isStudent = user?.kind === 'student';

  const [card, setCard] = useState(EMPTY);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [rewardUnlocked, setRewardUnlocked] = useState(false);

  const [friends, setFriends] = useState<Friend[]>(seedFriends);
  const [requests, setRequests] = useState<FriendRequest[]>(seedRequests);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  /**
   * The reward count from the previous read. A card fills at the counter, not
   * in the app, so the only way the phone learns about it is seeing the number
   * go up between two polls — that transition is what raises the celebration.
   * Null until the first load, so signing in with rewards already banked is not
   * mistaken for having just earned them.
   */
  const lastRewards = useRef<number | null>(null);

  const notify = useCallback((title: string, body: string) => {
    setNotifications(current => [
      {id: `${Date.now()}-${current.length}`, title, body},
      ...current,
    ]);
  }, []);

  const apply = useCallback(
    (next: typeof EMPTY, celebrate: boolean) => {
      const previous = lastRewards.current;
      if (celebrate && previous !== null && next.rewards > previous) {
        notify(
          'Free coffee unlocked',
          `You collected ${STAMPS_PER_REWARD} stamps.`,
        );
        setRewardUnlocked(true);
      }
      lastRewards.current = next.rewards;
      setCard(next);
    },
    [notify],
  );

  const refresh = useCallback(async () => {
    if (user === null) {
      return;
    }
    try {
      const data = await fetchCard();
      apply(
        {
          stamps: data.card.stamps,
          lifetimeStamps: data.card.lifetimeStamps,
          rewards: data.card.rewards,
          coffeesRedeemed: data.card.coffeesRedeemed,
        },
        true,
      );
      setLeaderboard(data.leaderboard.map(toEntry));
      setRank(data.rank);
      setError(null);
      setStatus('ready');
    } catch (caught) {
      // The card keeps showing whatever it last knew rather than blanking; a
      // stale number is far better on a counter queue than an empty card.
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Could not reach Netaville.',
      );
      setStatus(current => (current === 'ready' ? 'ready' : 'error'));
    }
  }, [user, apply]);

  // First load, and again whenever the account changes.
  useEffect(() => {
    if (authStatus !== 'signedIn') {
      setCard(EMPTY);
      setLeaderboard([]);
      setRank(null);
      setStatus('loading');
      lastRewards.current = null;
      return;
    }
    void refresh();
  }, [authStatus, refresh]);

  // While the app is in front, re-read on a timer: a stamp given at the till
  // should appear on the phone without the person doing anything.
  useEffect(() => {
    if (authStatus !== 'signedIn') {
      return;
    }
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [authStatus, refresh]);

  // And immediately on coming back to the app — the common case is putting the
  // phone away at the counter and looking again a moment later.
  useEffect(() => {
    if (authStatus !== 'signedIn') {
      return;
    }
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') {
        void refresh();
      }
    });
    return () => subscription.remove();
  }, [authStatus, refresh]);

  const value = useMemo<LoyaltyContextValue>(
    () => ({
      stamps: card.stamps,
      lifetimeStamps: card.lifetimeStamps,
      rewards: card.rewards,
      coffeesRedeemed: card.coffeesRedeemed,
      status,
      error,
      refresh,
      isStudent,
      friends,
      requests,
      notifications,
      leaderboard,
      rank,
      rewardUnlocked,
      dismissRewardUnlocked: () => setRewardUnlocked(false),

      redeemReward: async () => {
        if (card.rewards === 0) {
          return;
        }
        try {
          const {card: next} = await redeemCoffee();
          // Not a celebration: rewards went down, so `apply` is told not to.
          apply(
            {
              stamps: next.stamps,
              lifetimeStamps: next.lifetimeStamps,
              rewards: next.rewards,
              coffeesRedeemed: next.coffeesRedeemed,
            },
            false,
          );
          notify('Reward redeemed', 'Enjoy your free coffee.');
        } catch (caught) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : 'Could not redeem just now. Try again.',
          );
        }
      },

      giftReward: friendId => {
        // Gifting has no server side yet; the screen that offers it says so.
        const friend = friends.find(candidate => candidate.id === friendId);
        notify(
          'Gift sent',
          `${friend?.displayName ?? 'Your friend'} got a free coffee.`,
        );
      },

      acceptRequest: id => {
        const found = requests.find(candidate => candidate.id === id);
        if (found === undefined) {
          return;
        }
        setRequests(current => current.filter(c => c.id !== id));
        setFriends(current => [
          ...current,
          {id: found.id, displayName: found.displayName, lifetimeStamps: 0},
        ]);
      },

      declineRequest: id =>
        setRequests(current => current.filter(c => c.id !== id)),

      removeFriend: id =>
        setFriends(current => current.filter(c => c.id !== id)),

      sendRequest: displayName => {
        const name = displayName.trim();
        if (name.length === 0) {
          return;
        }
        notify('Request sent', `We let ${name} know you want to connect.`);
      },

      clearNotifications: () => setNotifications([]),
    }),
    [
      card,
      status,
      error,
      refresh,
      isStudent,
      friends,
      requests,
      notifications,
      leaderboard,
      rank,
      rewardUnlocked,
      apply,
      notify,
    ],
  );

  return (
    <LoyaltyContext.Provider value={value}>{children}</LoyaltyContext.Provider>
  );
}

function toEntry(row: ApiLeaderboardEntry): LeaderboardEntry {
  return {
    id: row.userId,
    displayName: row.displayName,
    lifetimeStamps: row.lifetimeStamps,
    monthStamps: row.monthStamps,
    isYou: row.isYou,
  };
}

export function useLoyalty(): LoyaltyContextValue {
  const context = useContext(LoyaltyContext);
  if (context === null) {
    throw new Error('useLoyalty must be used inside <LoyaltyProvider>');
  }
  return context;
}
