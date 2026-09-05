import {StyleSheet, Text, View} from 'react-native';
import type {ReactNode} from 'react';
import {colors, fonts, spacing} from '@/theme';

type Props = {
  children: string;
  /** Optional leading mark, e.g. the menu's category icons. */
  icon?: ReactNode;
};

/** Editorial section header: just the label, in small caps. */
export function SectionLabel({children, icon}: Props) {
  return (
    <View style={styles.row}>
      {icon}
      <Text style={styles.label}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  label: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
});
