import {StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {Coffee, Gift, GraduationCap, Minus, Plus} from 'lucide-react-native';
import {GhostButton} from '@/components/GhostButton';
import {BrandMotif} from '@/components/BrandMotif';
import {PrimaryButton} from '@/components/PrimaryButton';
import {ProgressBar} from '@/components/ProgressBar';
import {PromoBanner} from '@/components/PromoBanner';
import {Screen} from '@/components/Screen';
import {SectionLabel} from '@/components/SectionLabel';
import {StampGrid} from '@/components/StampGrid';
import {StatStrip} from '@/components/StatStrip';
import {TierBadge} from '@/components/TierBadge';
import {TierMedal} from '@/components/TierMedal';
import {useLoyalty} from '@/context/loyalty';
import {
  STAMPS_PER_REWARD,
  activePromotion,
  nextTierFor,
  tierFor,
} from '@/data/loyalty';
import {colors, fonts, icon, radii, spacing, type as typography} from '@/theme';

export default function CardScreen() {
  const router = useRouter();
  const {
    stamps,
    lifetimeStamps,
    rewards,
    coffeesRedeemed,
    isStudent,
    rank,
    addStamp,
    removeStamp,
    redeemReward,
  } = useLoyalty();

  const tier = tierFor(lifetimeStamps);
  const nextTier = nextTierFor(lifetimeStamps);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={typography.display}>Your card</Text>
          <Text style={typography.body}>
            {STAMPS_PER_REWARD} stamps and your next coffee is free.
          </Text>
        </View>
        <TierBadge tier={tier} />
      </View>

      <View style={styles.section}>
        <PromoBanner promotion={activePromotion} />
      </View>

      <View style={styles.section}>
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.countRow}>
              <Text style={styles.count}>
                {stamps}
                <Text style={styles.countTotal}>/{STAMPS_PER_REWARD}</Text>
              </Text>
              <View style={styles.toGo}>
                <Text style={styles.toGoText}>
                  {STAMPS_PER_REWARD - stamps} to a free coffee
                </Text>
              </View>
            </View>
            <Text style={styles.hint}>Show this to staff to add a stamp</Text>
          </View>
          <StampGrid filled={stamps} />
          <View style={styles.stampActions}>
            <GhostButton
              label="Remove"
              size="sm"
              onPress={removeStamp}
              icon={<Minus size={15} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />}
            />
            <PrimaryButton
              label="Add stamp"
              size="sm"
              onPress={() => addStamp()}
              icon={<Plus size={15} strokeWidth={icon.strokeWidth} color={colors.textOnBrand} />}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <SectionLabel>Rewards wallet</SectionLabel>
        <View style={[styles.card, styles.wallet]}>
          <BrandMotif
            name="traces"
            color={colors.coral}
            size={190}
            rotation={0}
            opacity={0.22}
            position={styles.walletMotif}
          />
          <View style={styles.walletHead}>
            <Coffee size={22} strokeWidth={icon.strokeWidth} color={colors.coralText} />
            <Text style={styles.walletCount}>
              {rewards}{' '}
              <Text style={styles.walletLabel}>
                free {rewards === 1 ? 'coffee' : 'coffees'} banked
              </Text>
            </Text>
          </View>
          <View style={styles.walletRule} />
          <View style={styles.walletActions}>
            <GhostButton
              label="Gift"
              size="sm"
              style={styles.walletButton}
              onPress={() => router.push('/friends')}
              icon={<Gift size={15} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />}
            />
            <PrimaryButton
              label="Redeem"
              size="sm"
              style={styles.walletButton}
              onPress={redeemReward}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <SectionLabel>{`${tier.name} tier`}</SectionLabel>
        <View style={styles.card}>
          <View style={styles.tierHead}>
            <TierMedal tier={tier.name} size={30} />
            <Text style={styles.tierHeadText}>
              {lifetimeStamps} lifetime stamps
            </Text>
          </View>
          <ProgressBar
            value={
              nextTier === null
                ? 1
                : (lifetimeStamps - tier.threshold) /
                  (nextTier.threshold - tier.threshold)
            }
            tint={tier.color}
          />
          <Text style={styles.tierText}>
            {nextTier === null
              ? 'Top tier. Nothing left to climb.'
              : `${nextTier.threshold - lifetimeStamps} stamps to ${nextTier.name} · ${nextTier.perk}`}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <SectionLabel>Your stats</SectionLabel>
        <StatStrip
          stats={[
            {label: 'Lifetime', value: String(lifetimeStamps), tint: colors.brandBlue},
            {label: 'Redeemed', value: String(coffeesRedeemed), tint: colors.coral},
            {label: 'Rank', value: `#${rank}`, tint: colors.cyan},
          ]}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.studentCard}>
          <GraduationCap size={20} strokeWidth={icon.strokeWidth} color={colors.cyanText} />
          <View style={styles.studentBody}>
            <Text style={styles.studentTitle}>
              {isStudent ? 'Student discount active' : 'Get the student discount'}
            </Text>
            <Text style={styles.studentText}>
              {isStudent
                ? 'Student prices are shown on the menu.'
                : 'Verify your student status in Profile to unlock lower prices.'}
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerText: {flex: 1, gap: spacing.xs},
  section: {paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.xl},
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl - 2,
    gap: spacing.lg,
  },
  cardHead: {gap: 4},
  countRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  toGo: {
    backgroundColor: colors.blueTintBg,
    borderRadius: radii.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  toGoText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.brandBlue,
  },
  wallet: {
    backgroundColor: colors.coralTintBg,
    borderColor: colors.coralTintBorder,
    overflow: 'hidden',
    gap: spacing.md,
  },
  walletMotif: {top: -34, right: -44},
  walletRule: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.coralTintBorder,
  },
  walletHead: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  tierHead: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  tierHeadText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.textInk,
  },
  count: {
    fontFamily: fonts.extrabold,
    fontSize: 34,
    letterSpacing: -1,
    color: colors.textInk,
  },
  countTotal: {fontSize: 22, color: colors.textDim},
  hint: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  stampActions: {flexDirection: 'row', justifyContent: 'space-between'},
  walletCount: {
    fontFamily: fonts.extrabold,
    fontSize: 28,
    letterSpacing: -0.6,
    color: colors.textInk,
  },
  walletLabel: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.coralText,
  },
  walletActions: {flexDirection: 'row', gap: spacing.md},
  walletButton: {flex: 1},
  tierText: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: colors.textMuted,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.cyanTintBg,
    borderRadius: radii.cardSm,
    borderWidth: 1,
    borderColor: colors.cyanTintBorder,
    padding: spacing.lg,
  },
  studentBody: {flex: 1, gap: 2},
  studentTitle: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: colors.textInk,
  },
  studentText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.cyanText,
  },
});
