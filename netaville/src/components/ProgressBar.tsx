import {StyleSheet, View} from 'react-native';
import {colors} from '@/theme';

type Props = {
  /** 0–1. */
  value: number;
  tint?: string;
};

export function ProgressBar({value, tint = colors.brandBlue}: Props) {
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <View style={styles.track}>
      <View
        style={[styles.fill, {backgroundColor: tint, width: `${clamped * 100}%`}]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.blueTintBg,
    overflow: 'hidden',
  },
  fill: {height: '100%', borderRadius: 4},
});
