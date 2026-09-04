import {StyleSheet, Text, View} from 'react-native';
import {colors, fonts, spacing} from '@/theme';

type Props = {
  children: string;
  /** Accent for the leading marker; defaults to the dim rule colour. */
  tone?: string;
};

/** Editorial section header: label, then a hairline running to the margin. */
export function SectionLabel({children, tone}: Props) {
  return (
    <View style={styles.row}>
      {tone === undefined ? null : (
        <View style={[styles.marker, {backgroundColor: tone}]} />
      )}
      <Text style={styles.label}>{children}</Text>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  marker: {width: 7, height: 7, borderRadius: 1.5},
  label: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
});
