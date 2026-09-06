import type {ReactNode} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import {colors, fonts, radii, spacing} from '@/theme';

/**
 * The app's button. Flat: a solid fill, one border, and opacity on press.
 *
 * No ripple, no gradient sheen, no scale — those read as decoration on a
 * screen that already carries the brand in its motifs and colour, and they
 * made every tap feel slower than it was.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  /** Stretches the button across its row. */
  full?: boolean;
  /** Refuses presses and dims it, e.g. while a submit is in flight. */
  disabled?: boolean;
  /** Swaps the icon for a spinner and blocks presses. */
  loading?: boolean;
  style?: ViewStyle;
};

const variants: Record<
  ButtonVariant,
  {background: string; border: string; label: string}
> = {
  primary: {
    background: colors.brandBlue,
    border: colors.brandBlue,
    label: colors.textOnBrand,
  },
  secondary: {
    background: colors.surface,
    border: colors.blueTintBorder,
    label: colors.brandBlue,
  },
  // For the softer of two side-by-side actions: no border, no fill.
  quiet: {
    background: 'transparent',
    border: 'transparent',
    label: colors.textMuted,
  },
  danger: {
    background: colors.surface,
    border: colors.coralTintBorder,
    label: colors.coralText,
  },
};

export function PrimaryButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  size = 'md',
  full = false,
  disabled = false,
  loading = false,
  style,
}: Props) {
  const palette = variants[variant];
  const blocked = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled: blocked}}
      disabled={blocked}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        size === 'sm' ? styles.sm : styles.md,
        {backgroundColor: palette.background, borderColor: palette.border},
        full ? styles.full : null,
        blocked ? styles.blocked : null,
        pressed ? styles.pressed : null,
        style,
      ]}>
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator size="small" color={palette.label} />
        ) : (
          icon
        )}
        <Text
          style={[
            styles.label,
            size === 'sm' ? styles.labelSm : null,
            {color: palette.label},
          ]}
          numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: {paddingVertical: 14, paddingHorizontal: spacing.xl},
  sm: {paddingVertical: 9, paddingHorizontal: 16},
  full: {alignSelf: 'stretch'},
  inner: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  label: {
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: -0.1,
  },
  labelSm: {fontSize: 13},
  pressed: {opacity: 0.72},
  blocked: {opacity: 0.5},
});
