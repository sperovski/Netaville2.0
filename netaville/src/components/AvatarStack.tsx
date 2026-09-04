import {StyleSheet, Text, View} from 'react-native';
import {Avatar} from './Avatar';
import {colors, fonts} from '@/theme';

type Props = {
  /** Total people going — the first three get a face, the rest become "+n". */
  count: number;
  /** Stable key (usually the event id) so the same event keeps the same faces. */
  seedKey: string;
  size?: number;
};

export function AvatarStack({count, seedKey, size = 32}: Props) {
  const shown = Math.min(3, count);
  const overflow = Math.max(0, count - shown);
  const dimension = {width: size, height: size, borderRadius: size / 2};

  return (
    <View style={styles.row}>
      {Array.from({length: shown}, (_, index) => (
        <View key={index} style={{marginLeft: index === 0 ? 0 : -size / 3}}>
          <Avatar seedKey={`${seedKey}-${index}`} size={size} ringed />
        </View>
      ))}
      {overflow > 0 ? (
        <View
          style={[
            styles.overflow,
            dimension,
            {marginLeft: shown === 0 ? 0 : -size / 3},
          ]}>
          <Text style={[styles.overflowText, {fontSize: size * 0.34}]}>+{overflow}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center'},
  overflow: {
    backgroundColor: colors.blueTintBg,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: {
    fontFamily: fonts.bold,
    color: colors.brandBlue,
  },
});
