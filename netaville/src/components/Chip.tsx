import {Pressable, StyleSheet, Text, View, type ViewStyle} from 'react-native';
import type {ReactNode} from 'react';
import {colors, fonts, radii, spacing} from '@/theme';

export type ChipTone = 'gold' | 'blue' | 'coral' | 'cyan';

type Props = {
  label: string;
  tone?: ChipTone;
  active?: boolean;
  icon?: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
};

const tones: Record<ChipTone, {bg: string; border: string; text: string}> = {
  gold: {bg: colors.goldChipBg, border: colors.goldChipBorder, text: colors.textMuted},
  blue: {bg: colors.blueTintBg, border: colors.blueTintBorder, text: colors.brandBlue},
  coral: {bg: colors.coralTintBg, border: colors.coralTintBorder, text: colors.coralText},
  cyan: {bg: colors.cyanTintBg, border: colors.cyanTintBorder, text: colors.cyanText},
};

export function Chip({label, tone = 'gold', active = false, icon, onPress, style}: Props) {
  const palette = tones[tone];
  const body = (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.brandBlue : palette.bg,
          borderColor: active ? colors.brandBlue : palette.border,
        },
        style,
      ]}>
      {icon}
      <Text
        style={[styles.label, {color: active ? colors.textOnBrand : palette.text}]}
        numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <Pressable onPress={onPress} hitSlop={4} style={({pressed}) => (pressed ? styles.pressed : null)}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    borderRadius: radii.chip,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
  },
  pressed: {
    opacity: 0.7,
  },
});
