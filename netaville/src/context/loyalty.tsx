import {createContext, useContext, useMemo, useState, type ReactNode} from 'react';
import {
  STAMPS_PER_REWARD,
  leaderboard as seedLeaderboard,
  seedFriends,
  seedRequests,
  type Friend,
  type FriendRequest,
  type LeaderboardEntry,
} from '@/data/loyalty';

export type Notification = {
  id: string;
  title: string;
  body: string;
};

type LoyaltyContextValue = {
  /** Stamps on the current card, 0–9 (a full card converts to a reward). */
  stamps: number;
  lifetimeStamps: number;
  /** Free coffees banked in the rewards wallet. */
  rewards: number;
  coffeesRedeemed: number;
  isStudent: boolean;
  friends: Friend[];
  requests: FriendRequest[];
  notifications: Notification[];
  leaderboard: LeaderboardEntry[];
  rank: number;
  addStamp: (count?: number) => void;
  removeStamp: () => void;
  redeemReward: () => void;
  giftReward: (friendId: string) => void;
  setStudent: (next: boolean) => void;
  acceptRequest: (id: string) => void;
  declineRequest: (id: string) => void;
  removeFriend: (id: string) => void;
  sendRequest: (displayName: string) => void;
  clearNotifications: () => void;
};

const LoyaltyContext = createContext<LoyaltyContextValue | null>(null);

export function LoyaltyProvider({children}: {children: ReactNode}) {
  const [stamps, setStamps] = useState(7);
  const [lifetimeStamps, setLifetimeStamps] = useState(128);
  const [rewards, setRewards] = useState(1);
  const [coffeesRedeemed, setCoffeesRedeemed] = useState(12);
  const [isStudent, setStudent] = useState(false);
  const [friends, setFriends] = useState<Friend[]>(seedFriends);
  const [requests, setRequests] = useState<FriendRequest[]>(seedRequests);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const value = useMemo<LoyaltyContextValue>(() => {
    const notify = (title: string, body: string) =>
      setNotifications(current => [
        {id: `${Date.now()}-${current.length}`, title, body},
        ...current,
      ]);

    const board = seedLeaderboard
      .map(entry =>
        entry.isYou ? {...entry, lifetimeStamps} : entry,
      )
      .sort((a, b) => b.lifetimeStamps - a.lifetimeStamps);

    return {
      stamps,
      lifetimeStamps,
      rewards,
      coffeesRedeemed,
      isStudent,
      friends,
      requests,
      notifications,
      leaderboard: board,
      rank: board.findIndex(entry => entry.isYou) + 1,

      addStamp: (count = 1) => {
        setLifetimeStamps(current => current + count);
        setStamps(current => {
          const total = current + count;
          const earned = Math.floor(total / STAMPS_PER_REWARD);
          if (earned > 0) {
            setRewards(banked => banked + earned);
            notify('Free coffee unlocked', `You collected ${STAMPS_PER_REWARD} stamps!`);
          }
          return total % STAMPS_PER_REWARD;
        });
      },

      removeStamp: () => {
        setStamps(current => Math.max(0, current - 1));
        setLifetimeStamps(current => Math.max(0, current - 1));
      },

      redeemReward: () => {
        if (rewards === 0) {
          return;
        }
        setRewards(current => current - 1);
        setCoffeesRedeemed(current => current + 1);
        notify('Reward redeemed', 'Enjoy your free coffee.');
      },

      giftReward: friendId => {
        if (rewards === 0) {
          return;
        }
        const friend = friends.find(candidate => candidate.id === friendId);
        setRewards(current => current - 1);
        notify('Gift sent', `${friend?.displayName ?? 'Your friend'} got a free coffee.`);
      },

      setStudent,

      acceptRequest: id => {
        const request = requests.find(candidate => candidate.id === id);
        if (!request) {
          return;
        }
        setRequests(current => current.filter(candidate => candidate.id !== id));
        setFriends(current => [
          ...current,
          {id: request.id, displayName: request.displayName, lifetimeStamps: 0},
        ]);
      },

      declineRequest: id =>
        setRequests(current => current.filter(candidate => candidate.id !== id)),

      removeFriend: id =>
        setFriends(current => current.filter(candidate => candidate.id !== id)),

      sendRequest: displayName => {
        const name = displayName.trim();
        if (name.length === 0) {
          return;
        }
        notify('Request sent', `We let ${name} know you want to connect.`);
      },

      clearNotifications: () => setNotifications([]),
    };
  }, [
    stamps,
    lifetimeStamps,
    rewards,
    coffeesRedeemed,
    isStudent,
    friends,
    requests,
    notifications,
  ]);

  return <LoyaltyContext.Provider value={value}>{children}</LoyaltyContext.Provider>;
}

export function useLoyalty(): LoyaltyContextValue {
  const context = useContext(LoyaltyContext);
  if (context === null) {
    throw new Error('useLoyalty must be used inside <LoyaltyProvider>');
  }
  return context;
}
