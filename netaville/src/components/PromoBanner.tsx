import {StyleSheet, Text, View} from 'react-native';
import LottieView from 'lottie-react-native';
import type {Promotion} from '@/data/loyalty';
import {colors, fonts, radii, spacing} from '@/theme';

/** Swap this file for the exported LottieFiles JSON to change the animation. */
const promoAnimation = require('../../assets/lottie/double-stamps.json');

export function PromoBanner({promotion}: {promotion: Promotion}) {
  return (
    <View style={styles.banner}>
      <LottieView
        source={promoAnimation}
        autoPlay
        loop
        style={styles.animation}
      />
      <View style={styles.body}>
        <Text style={styles.title}>{promotion.title}</Text>
        <Text style={styles.description}>{promotion.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.goldCardBg,
    borderRadius: radii.cardSm,
    borderWidth: 1,
    borderColor: colors.goldCardBorder,
    padding: spacing.lg,
  },
  animation: {width: 40, height: 40},
  body: {flex: 1, gap: 2},
  title: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: colors.textInk,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.goldText,
  },
});
