import {NextResponse} from 'next/server';
import {cardFor, leaderboard} from '@/lib/store';
import {requireAppUser} from '@/lib/student';
import {STAMPS_PER_REWARD} from '@/lib/types';

/**
 * The signed-in account's loyalty card, as the app's Card and Ranks tabs draw
 * it.
 *
 * The card itself is the row the counter writes to — the same numbers a member
 * of staff sees when they scan, so the phone and the till can never disagree.
 * Before this existed the app carried its own invented figures in memory, which
 * looked convincing and meant nothing.
 *
 * The board comes back with it because both tabs need it and it is one query;
 * splitting them would only cost the phone a second round trip.
 */
export async function GET(request: Request) {
  const gate = await requireAppUser(request);
  if ('response' in gate) {
    return gate.response;
  }

  const [card, board] = await Promise.all([
    cardFor(gate.user.id),
    leaderboard(50),
  ]);

  // Rank is over the same board the app draws, so the number on the card and
  // the position in the list are always the same fact.
  const position = board.findIndex(entry => entry.userId === gate.user.id);

  return NextResponse.json(
    {
      card: {
        stamps: card.stamps,
        lifetimeStamps: card.lifetimeStamps,
        rewards: card.rewards,
        coffeesRedeemed: card.coffeesRedeemed,
        stampsPerReward: STAMPS_PER_REWARD,
      },
      rank: position === -1 ? null : position + 1,
      leaderboard: board.map(entry => ({
        userId: entry.userId,
        displayName: entry.displayName,
        lifetimeStamps: entry.lifetimeStamps,
        monthStamps: entry.monthStamps,
        isYou: entry.userId === gate.user.id,
      })),
    },
    {headers: {'Cache-Control': 'no-store'}},
  );
}
