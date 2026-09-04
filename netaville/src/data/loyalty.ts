export const STAMPS_PER_REWARD = 10;

export type Tier = {
  name: 'Bronze' | 'Gold' | 'Platinum';
  threshold: number;
  perk: string;
  color: string;
};

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  studentPrice: number;
  stamps: number;
};

export type MenuCategory = {
  id: string;
  title: string;
  items: MenuItem[];
};

export type LeaderboardEntry = {
  id: string;
  displayName: string;
  lifetimeStamps: number;
  monthStamps: number;
  isYou?: boolean;
};

export type Friend = {
  id: string;
  displayName: string;
  lifetimeStamps: number;
};

export type FriendRequest = {
  id: string;
  displayName: string;
};

export type Promotion = {
  id: string;
  title: string;
  description: string;
};

export const menu: MenuCategory[] = [
  {
    id: 'espresso',
    title: 'Espresso based',
    items: [
      {id: 'espresso', name: 'Espresso', price: 70, studentPrice: 60, stamps: 1},
      {id: 'macchiato', name: 'Macchiato', price: 80, studentPrice: 70, stamps: 1},
      {id: 'americano', name: 'Americano', price: 90, studentPrice: 80, stamps: 1},
      {id: 'cappuccino', name: 'Cappuccino', price: 110, studentPrice: 95, stamps: 1},
      {id: 'flat-white', name: 'Flat white', price: 130, studentPrice: 110, stamps: 2},
      {id: 'latte', name: 'Caffè latte', price: 130, studentPrice: 110, stamps: 2},
    ],
  },
  {
    id: 'specialty',
    title: 'Specialty',
    items: [
      {id: 'v60', name: 'V60 pour over', price: 150, studentPrice: 130, stamps: 2},
      {id: 'cold-brew', name: 'Cold brew', price: 150, studentPrice: 130, stamps: 2},
      {id: 'iced-latte', name: 'Iced latte', price: 140, studentPrice: 120, stamps: 2},
    ],
  },
  {
    id: 'other',
    title: 'Not coffee',
    items: [
      {id: 'tea', name: 'Loose leaf tea', price: 90, studentPrice: 80, stamps: 1},
      {id: 'matcha', name: 'Matcha latte', price: 150, studentPrice: 130, stamps: 2},
      {id: 'lemonade', name: 'Homemade lemonade', price: 120, studentPrice: 100, stamps: 1},
    ],
  },
];

export const tiers: Tier[] = [
  {name: 'Bronze', threshold: 0, perk: 'Where everyone starts', color: '#B27A4B'},
  {name: 'Gold', threshold: 100, perk: '+5 bonus stamps', color: '#F5B301'},
  {name: 'Platinum', threshold: 250, perk: '+10 bonus stamps', color: '#7C86A8'},
];

export function tierFor(lifetimeStamps: number): Tier {
  // tiers are ordered low → high, so the last one we clear is the current one.
  let current = tiers[0]!;
  for (const tier of tiers) {
    if (lifetimeStamps >= tier.threshold) {
      current = tier;
    }
  }
  return current;
}

export function nextTierFor(lifetimeStamps: number): Tier | null {
  return tiers.find(tier => tier.threshold > lifetimeStamps) ?? null;
}

export const activePromotion: Promotion = {
  id: 'double-stamps',
  title: 'Double stamps today',
  description: 'Every order earns 2× stamps right now.',
};

export const leaderboard: LeaderboardEntry[] = [
  {id: 'l1', displayName: 'Quiet Otter', lifetimeStamps: 312, monthStamps: 41},
  {id: 'l2', displayName: 'Marble Fox', lifetimeStamps: 268, monthStamps: 37},
  {id: 'l3', displayName: 'Slow Comet', lifetimeStamps: 204, monthStamps: 22},
  {id: 'l4', displayName: 'Paper Lantern', lifetimeStamps: 176, monthStamps: 33},
  {id: 'me', displayName: 'Stefan P.', lifetimeStamps: 128, monthStamps: 26, isYou: true},
  {id: 'l6', displayName: 'Copper Wren', lifetimeStamps: 119, monthStamps: 14},
  {id: 'l7', displayName: 'Amber Vale', lifetimeStamps: 94, monthStamps: 19},
  {id: 'l8', displayName: 'Northern Kite', lifetimeStamps: 71, monthStamps: 9},
];

export const seedFriends: Friend[] = [
  {id: 'f1', displayName: 'Marble Fox', lifetimeStamps: 268},
  {id: 'f2', displayName: 'Copper Wren', lifetimeStamps: 119},
  {id: 'f3', displayName: 'Amber Vale', lifetimeStamps: 94},
];

export const seedRequests: FriendRequest[] = [
  {id: 'r1', displayName: 'Paper Lantern'},
];
