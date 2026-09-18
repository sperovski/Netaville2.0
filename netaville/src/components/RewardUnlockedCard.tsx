import {Image, Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {PrimaryButton} from './PrimaryButton';
import {STAMPS_PER_REWARD} from '@/data/loyalty';
import {colors, fonts, radii, spacing} from '@/theme';

/**
 * What appears the moment a stamp card fills up.
 *
 * A full card is the whole point of the loyalty scheme, and until now it
 * passed by as a line in the notifications list. This is the one moment in the
 * app worth interrupting someone for, so it gets the illustration and a single
 * thing to do — on a plain paper surface, nothing else competing with it.
 */

type Props = {
  visible: boolean;
  /** Free coffees now waiting, including the one just earned. */
  rewards: number;
  onDismiss: () => void;
};

export function RewardUnlockedCard({visible, rewards, onDismiss}: Props) {
  const waiting =
    rewards > 1
      ? `That makes ${rewards} free coffees waiting for you.`
      : 'Show your card at the counter to claim it.';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        style={styles.scrim}
        onPress={onDismiss}>
        {/* Swallows taps so a press inside the card does not dismiss it. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Image
            source={require('../../assets/free-coffee.png')}
            style={styles.art}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />

          <View style={styles.copy}>
            <Text style={styles.title}>Your coffee is on us</Text>
            <Text style={styles.body}>
              You collected {STAMPS_PER_REWARD} stamps, so your next coffee is
              free. {waiting}
            </Text>
          </View>

          <PrimaryButton label="Got it" full onPress={onDismiss} />
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
    maxWidth: 360,
    backgroundColor: colors.canvas,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  art: {
    width: '76%',
    height: 170,
    alignSelf: 'center',
  },
  copy: {gap: spacing.sm},
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 25,
    lineHeight: 30,
    letterSpacing: -0.7,
    color: colors.textInk,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.textMuted,
  },
});
