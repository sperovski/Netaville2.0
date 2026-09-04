import {StyleSheet, Text, View} from 'react-native';
import type {Tier} from '@/data/loyalty';
import {colors, fonts, radii, spacing} from '@/theme';
import {TierMedal} from './TierMedal';

export function TierBadge({tier}: {tier: Tier}) {
  return (
    <View style={[styles.badge, {borderColor: tier.color}]}>
      <TierMedal tier={tier.name} size={18} />
      <Text style={[styles.label, {color: tier.color}]}>{tier.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.chip,
    borderWidth: 1,
    backgroundColor: colors.surface,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    paddingVertical: 5,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
