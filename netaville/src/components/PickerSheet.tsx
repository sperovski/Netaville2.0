import type {ReactNode} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, fonts, radii, spacing} from '@/theme';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Shown as a text button on the right of the header; omit for none. */
  action?: {label: string; onPress: () => void};
  children: ReactNode;
};

/**
 * The shared shell every picker on the request form drops into: a dimmed
 * backdrop and a rounded panel that slides up from the bottom. Tapping the
 * backdrop or the close control dismisses it.
 *
 * Plain RN `Modal` rather than a sheet library — the app keeps its dependency
 * list short, and `animationType="slide"` is the whole animation this needs.
 */
export function PickerSheet({visible, title, onClose, action, children}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          accessibilityLabel="Dismiss"
          onPress={onClose}
        />
        <View style={[styles.panel, {paddingBottom: insets.bottom + spacing.lg}]}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {action ? (
              <Pressable
                accessibilityRole="button"
                onPress={action.onPress}
                hitSlop={10}
                style={({pressed}) => (pressed ? styles.pressed : null)}>
                <Text style={styles.action}>{action.label}</Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                hitSlop={10}
                style={({pressed}) => (pressed ? styles.pressed : null)}>
                <Text style={styles.action}>Done</Text>
              </Pressable>
            )}
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, justifyContent: 'flex-end'},
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 16, 60, 0.35)',
  },
  panel: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 18,
    letterSpacing: -0.4,
    color: colors.textInk,
  },
  action: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.brandBlue,
  },
  pressed: {opacity: 0.6},
  // Exposed so pickers can match the panel's side padding when they need to
  // bleed a row to the edges.
  bleed: {marginHorizontal: -spacing.xl, paddingHorizontal: spacing.xl},
});

export const pickerSheetBleed = styles.bleed;
