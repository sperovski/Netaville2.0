import {NextResponse} from 'next/server';
import {redeemReward} from '@/lib/store';
import {requireAppUser} from '@/lib/student';
import {STAMPS_PER_REWARD} from '@/lib/types';

/**
 * Spends one banked free coffee.
 *
 * The same `redeemReward` the counter calls, so a reward claimed in the app and
 * one handed over at the till go through one code path and one row lock. The
 * transaction is what stops a double tap, or a phone and a till redeeming at
 * the same moment, from spending the same coffee twice.
 *
 * `actorId` is null: nobody behind the counter did this, the student did.
 */
export async function POST(request: Request) {
  const gate = await requireAppUser(request);
  if ('response' in gate) {
    return gate.response;
  }

  const result = await redeemReward(gate.user.id, null);
  if ('error' in result) {
    return NextResponse.json(
      {error: 'You have no free coffees banked yet.'},
      {status: 409},
    );
  }

  return NextResponse.json({
    card: {
      stamps: result.stamps,
      lifetimeStamps: result.lifetimeStamps,
      rewards: result.rewards,
      coffeesRedeemed: result.coffeesRedeemed,
      stampsPerReward: STAMPS_PER_REWARD,
    },
  });
}
