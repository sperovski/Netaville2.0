import {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Avatar} from '@/components/Avatar';
import {Chip} from '@/components/Chip';
import {Podium} from '@/components/Podium';
import {TierMedal} from '@/components/TierMedal';
import {Screen} from '@/components/Screen';
import {SectionLabel} from '@/components/SectionLabel';
import {useLoyalty} from '@/context/loyalty';
import {tierFor, tiers, type LeaderboardEntry} from '@/data/loyalty';
import {colors, fonts, radii, spacing, type as typography} from '@/theme';

const ranges = ['All time', 'This month'] as const;
type Range = (typeof ranges)[number];

function scoreFor(entry: LeaderboardEntry, range: Range): number {
  return range === 'All time' ? entry.lifetimeStamps : entry.monthStamps;
}

export default function RanksScreen() {
  const {leaderboard} = useLoyalty();
  const [range, setRange] = useState<Range>('All time');

  const ordered = [...leaderboard].sort(
    (a, b) => scoreFor(b, range) - scoreFor(a, range),
  );

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={typography.display}>Ranks</Text>
        <Text style={typography.body}>Ranked by stamps collected.</Text>
        <View style={styles.toggleRow}>
          {ranges.map(candidate => (
            <Chip
              key={candidate}
              tone="blue"
              label={candidate}
              active={candidate === range}
              onPress={() => setRange(candidate)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Podium
          entries={ordered.slice(0, 3)}
          scoreOf={entry => scoreFor(entry, range)}
        />
      </View>

      <View style={styles.section}>
        <SectionLabel>Everyone else</SectionLabel>
        <View style={styles.card}>
          {ordered.slice(3).map((entry, index) => (
            <View
              key={entry.id}
              style={[
                styles.row,
                index === 0 ? null : styles.divided,
                entry.isYou ? styles.rowYou : null,
              ]}>
              <Text
                style={[
                  styles.position,
                  entry.isYou ? styles.positionYou : null,
                ]}>
                {index + 4}
              </Text>
              <Avatar seedKey={entry.id} size={34} />
              <View style={styles.rowBody}>
                <Text style={styles.name}>
                  {entry.displayName}
                  {entry.isYou ? ' · you' : ''}
                </Text>
                <View style={styles.tierLine}>
                  <TierMedal
                    tier={tierFor(entry.lifetimeStamps).name}
                    size={14}
                  />
                  <Text style={styles.tier}>
                    {tierFor(entry.lifetimeStamps).name}
                  </Text>
                </View>
              </View>
              <Text style={styles.score}>{scoreFor(entry, range)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionLabel>Tiers</SectionLabel>
        <View style={styles.card}>
          {tiers.map((tier, index) => (
            <View
              key={tier.name}
              style={[styles.row, index === 0 ? null : styles.divided]}>
              <TierMedal tier={tier.name} size={34} />
              <View style={styles.rowBody}>
                <Text style={styles.name}>{tier.name}</Text>
                <Text style={styles.tier}>{tier.perk}</Text>
              </View>
              <Text style={styles.threshold}>{tier.threshold}+</Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  toggleRow: {flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.md},
  section: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    // The inset lives on the rows, not here, so a highlighted row can run the
    // full width of the card instead of stopping short at both ends. `hidden`
    // is what then keeps it inside the rounded corners.
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowYou: {backgroundColor: colors.blueTintBg},
  divided: {borderTopWidth: 1, borderTopColor: colors.divider},
  position: {
    width: 22,
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.textDim,
  },
  positionYou: {color: colors.brandBlue},
  rowBody: {flex: 1, gap: 2},
  tierLine: {flexDirection: 'row', alignItems: 'center', gap: 5},
  name: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.textInk,
  },
  tier: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.textDim,
  },
  score: {
    fontFamily: fonts.extrabold,
    fontSize: 16,
    letterSpacing: -0.3,
    color: colors.textInk,
  },
  threshold: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.textMuted,
  },
});
