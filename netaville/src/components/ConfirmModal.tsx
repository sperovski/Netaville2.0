import type {ReactNode} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {PrimaryButton} from './PrimaryButton';
import {colors, fonts, radii, spacing} from '@/theme';

/**
 * The app's own confirmation, rather than the platform alert.
 *
 * `Alert.alert` renders in the system's chrome — system font, system corners,
 * system buttons — which is the one place in the app that looks like it
 * belongs to a different product. This carries the same tokens as everything
 * else, so a confirmation reads as part of Netaville.
 */
type Props = {
  visible: boolean;
  title: string;
  body: string;
  /** The button that goes through with it. */
  confirmLabel: string;
  cancelLabel?: string;
  /** Colours the confirm button for an action that takes something away. */
  destructive?: boolean;
  icon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Not now',
  destructive = false,
  icon,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}>
      {/* Tapping the scrim is the same as cancelling — the safe half. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        style={styles.scrim}
        onPress={onCancel}>
        {/* Swallows taps so a press inside the card does not dismiss it. */}
        <Pressable style={styles.card} onPress={() => {}}>
          {icon === undefined ? null : <View style={styles.icon}>{icon}</View>}
          <View style={styles.copy}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
          </View>
          <View style={styles.actions}>
            <PrimaryButton
              label={cancelLabel}
              variant="secondary"
              style={styles.action}
              onPress={onCancel}
            />
            <PrimaryButton
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              style={styles.action}
              onPress={onConfirm}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(36, 31, 107, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radii.iconButton,
    backgroundColor: colors.blueTintBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {gap: spacing.sm},
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 20,
    letterSpacing: -0.4,
    color: colors.textInk,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.textMuted,
  },
  actions: {flexDirection: 'row', gap: spacing.md},
  action: {flex: 1},
});
