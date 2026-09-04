import {StyleSheet, View} from 'react-native';
import {Coffee} from 'lucide-react-native';
import {STAMPS_PER_REWARD} from '@/data/loyalty';
import {colors, icon} from '@/theme';

type Props = {
  filled: number;
};

/** The punch card itself — ten slots, filled left to right. */
export function StampGrid({filled}: Props) {
  return (
    <View style={styles.grid}>
      {Array.from({length: STAMPS_PER_REWARD}, (_, index) => {
        const done = index < filled;
        return (
          <View key={index} style={[styles.slot, done ? styles.slotFilled : null]}>
            <Coffee
              size={18}
              strokeWidth={icon.strokeWidth}
              color={done ? colors.textOnBrand : colors.blueTintBorder}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.blueTintBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFilled: {
    backgroundColor: colors.brandBlue,
    borderColor: colors.brandBlue,
    borderStyle: 'solid',
  },
});
