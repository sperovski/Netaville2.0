import {StyleSheet, Text, View} from 'react-native';
import {Sparkles} from 'lucide-react-native';
import type {Promotion} from '@/data/loyalty';
import {colors, fonts, icon, radii, spacing} from '@/theme';

export function PromoBanner({promotion}: {promotion: Promotion}) {
  return (
    <View style={styles.banner}>
      <Sparkles size={20} strokeWidth={icon.strokeWidth} color={colors.goldText} />
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
