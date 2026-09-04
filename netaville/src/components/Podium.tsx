import {StyleSheet, Text, View} from 'react-native';
import {Avatar} from './Avatar';
import {TierMedal} from './TierMedal';
import {tierFor, type LeaderboardEntry} from '@/data/loyalty';
import {colors, fonts, radii, spacing} from '@/theme';

type Props = {
  /** Already ordered; the first three are placed 2nd–1st–3rd. */
  entries: LeaderboardEntry[];
  scoreOf: (entry: LeaderboardEntry) => number;
};

const PLACE_HEIGHTS = [76, 50, 36];

export function Podium({entries, scoreOf}: Props) {
  const [first, second, third] = entries;
  if (!first) {
    return null;
  }

  // Visual order puts the winner in the middle.
  const order = [second, first, third];

  return (
    <View style={styles.podium}>
      {order.map((entry, column) => {
        if (!entry) {
          return <View key={column} style={styles.slot} />;
        }
        const place = entry === first ? 1 : entry === second ? 2 : 3;
        const size = place === 1 ? 66 : 52;

        return (
          <View key={entry.id} style={styles.slot}>
            <View style={styles.person}>
              <View style={styles.avatarWrap}>
                <Avatar seedKey={entry.id} size={size} />
                <View style={styles.medal}>
                  <TierMedal tier={tierFor(entry.lifetimeStamps).name} size={22} />
                </View>
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {entry.displayName}
              </Text>
              <Text style={[styles.score, place === 1 ? styles.scoreFirst : null]}>
                {scoreOf(entry)}
              </Text>
            </View>
            <View
              style={[
                styles.block,
                {height: PLACE_HEIGHTS[place - 1]},
                place === 1 ? styles.blockFirst : null,
              ]}>
              <Text style={[styles.place, place === 1 ? styles.placeFirst : null]}>
                {place}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  slot: {flex: 1, alignItems: 'center'},
  person: {alignItems: 'center', gap: 3, paddingBottom: spacing.sm},
  avatarWrap: {marginBottom: 4},
  medal: {position: 'absolute', right: -5, bottom: -2},
  name: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    letterSpacing: -0.2,
    color: colors.textInk,
    maxWidth: 96,
  },
  score: {
    fontFamily: fonts.extrabold,
    fontSize: 15,
    letterSpacing: -0.3,
    color: colors.textMuted,
  },
  scoreFirst: {fontSize: 18, color: colors.brandBlue},
  block: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: colors.blueTintBg,
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  blockFirst: {backgroundColor: colors.brandBlue},
  place: {
    fontFamily: fonts.extrabold,
    fontSize: 16,
    color: colors.brandBlue,
  },
  placeFirst: {color: colors.textOnBrand},
});
