import type {ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {ChevronRight} from 'lucide-react-native';
import {colors, fonts, icon, radii, spacing} from '@/theme';

type Props = {
  icon: ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  tone?: 'default' | 'coral';
};

export function ListRow({icon: leading, label, value, onPress, tone = 'default'}: Props) {
  const coral = tone === 'coral';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.row,
        coral ? styles.coral : null,
        pressed ? styles.pressed : null,
      ]}>
      {leading}
      <View style={styles.body}>
        <Text style={[styles.label, coral ? styles.coralLabel : null]}>{label}</Text>
        {value === undefined ? null : <Text style={styles.value}>{value}</Text>}
      </View>
      <ChevronRight
        size={icon.size}
        strokeWidth={icon.strokeWidth}
        color={coral ? colors.coralText : colors.textDim}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.cardSm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  coral: {
    backgroundColor: colors.coralTintBg,
    borderColor: colors.coralTintBorder,
  },
  body: {flex: 1, gap: 2},
  label: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.textInk,
  },
  coralLabel: {color: colors.coralText},
  value: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  pressed: {opacity: 0.8},
});
