import {StyleSheet, Text, View} from 'react-native';
import {colors, fonts, radii, spacing} from '@/theme';

export type Stat = {
  label: string;
  value: string;
  /** Optional accent for the value; defaults to ink. */
  tint?: string;
  /** Relative column width. */
  flex?: number;
};

/** Several facts, one card, hairline rules between them. */
export function StatStrip({stats}: {stats: Stat[]}) {
  return (
    <View style={styles.strip}>
      {stats.map((stat, index) => (
        <View key={stat.label} style={styles.cell}>
          {index === 0 ? null : <View style={styles.rule} />}
          <View style={[styles.stat, {flex: stat.flex ?? 1}]}>
            <Text style={styles.label}>{stat.label}</Text>
            <Text
              style={[styles.value, stat.tint === undefined ? null : {color: stat.tint}]}
              numberOfLines={2}>
              {stat.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
  },
  cell: {flexDirection: 'row', flex: 1},
  rule: {width: 1, backgroundColor: colors.divider},
  stat: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  value: {
    fontFamily: fonts.extrabold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.5,
    color: colors.textInk,
    textAlign: 'center',
  },
});
