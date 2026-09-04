import {Pressable, StyleSheet, Text, View, type ViewStyle} from 'react-native';
import type {ReactNode} from 'react';
import {colors, fonts, radii, spacing} from '@/theme';

type Props = {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  size?: 'md' | 'sm';
  style?: ViewStyle;
};

export function GhostButton({label, onPress, icon, size = 'md', style}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        size === 'sm' ? styles.sm : styles.md,
        pressed ? styles.pressed : null,
        style,
      ]}>
      <View style={styles.inner}>
        {icon}
        <Text style={[styles.label, size === 'sm' ? styles.labelSm : null]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.blueTintBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: {paddingVertical: 13, paddingHorizontal: spacing.xl},
  sm: {paddingVertical: 8, paddingHorizontal: 16},
  inner: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  label: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.brandBlue,
    letterSpacing: -0.1,
  },
  labelSm: {fontSize: 13},
  pressed: {opacity: 0.7},
});
