import type {ReactNode} from 'react';
import {Pressable, StyleSheet} from 'react-native';
import {colors, radii} from '@/theme';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
};

export function IconButton({children, onPress, accessibilityLabel}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({pressed}) => [styles.button, pressed ? styles.pressed : null]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: radii.iconButton,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {opacity: 0.7},
});
