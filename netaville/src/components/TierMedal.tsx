import {Image, StyleSheet} from 'react-native';
import type {Tier} from '@/data/loyalty';

/** require() needs static paths, so the three coins are mapped up front. */
const medals = {
  Bronze: require('../../assets/tiers/bronze.png'),
  Gold: require('../../assets/tiers/gold.png'),
  Platinum: require('../../assets/tiers/platinum.png'),
} as const;

type Props = {
  tier: Tier['name'];
  size?: number;
};

export function TierMedal({tier, size = 22}: Props) {
  return (
    <Image
      source={medals[tier]}
      style={[styles.medal, {width: size, height: size}]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  medal: {flexShrink: 0},
});
