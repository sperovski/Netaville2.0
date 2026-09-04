import {StyleSheet, Text, View} from 'react-native';
import {Chip} from '@/components/Chip';
import {Screen} from '@/components/Screen';
import {SectionLabel} from '@/components/SectionLabel';
import {useLoyalty} from '@/context/loyalty';
import {menu, type MenuItem} from '@/data/loyalty';
import {colors, fonts, radii, spacing, type as typography} from '@/theme';

function Row({item, isStudent}: {item: MenuItem; isStudent: boolean}) {
  const price = isStudent ? item.studentPrice : item.price;

  return (
    <View style={styles.row}>
      <View style={styles.stampBadge}>
        <Text style={styles.stampBadgeText}>{item.stamps}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.stamps}>
          {item.stamps === 1 ? 'one stamp' : `${item.stamps} stamps`}
        </Text>
      </View>
      <View style={styles.prices}>
        {isStudent ? <Text style={styles.was}>{item.price}</Text> : null}
        <Text style={styles.price}>
          {price}
          <Text style={styles.currency}> ден</Text>
        </Text>
      </View>
    </View>
  );
}

export default function MenuScreen() {
  const {isStudent, setStudent} = useLoyalty();

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text style={typography.display}>Menu</Text>
        <Text style={typography.body}>
          Every order adds stamps to your card.
        </Text>
        <View style={styles.toggleRow}>
          <Chip
            tone="blue"
            label="Regular prices"
            active={!isStudent}
            onPress={() => setStudent(false)}
          />
          <Chip
            tone="blue"
            label="Student prices"
            active={isStudent}
            onPress={() => setStudent(true)}
          />
        </View>
      </View>

      {menu.map(category => (
        <View key={category.id} style={styles.section}>
          <SectionLabel tone={colors.gold}>{category.title}</SectionLabel>
          <View style={styles.card}>
            {category.items.map((item, index) => (
              <View
                key={item.id}
                style={index === 0 ? null : styles.divided}>
                <Row item={item} isStudent={isStudent} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  toggleRow: {flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.md},
  section: {paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.xl},
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  divided: {borderTopWidth: 1, borderTopColor: colors.divider},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg - 2,
  },
  stampBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.blueTintBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampBadgeText: {
    fontFamily: fonts.extrabold,
    fontSize: 13,
    color: colors.brandBlue,
  },
  rowBody: {flex: 1, gap: 2},
  name: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.textInk,
  },
  stamps: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.textDim,
  },
  prices: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  was: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textDim,
    textDecorationLine: 'line-through',
  },
  price: {
    fontFamily: fonts.extrabold,
    fontSize: 16,
    letterSpacing: -0.3,
    color: colors.textInk,
  },
  currency: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.textDim,
  },
});
