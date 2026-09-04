import {StyleSheet, View} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {avatarFor} from '@/data/avatars';
import {colors} from '@/theme';

type Props = {
  /** Any stable string — the same key always yields the same face. */
  seedKey: string;
  size?: number;
  /** White ring, used when avatars overlap in a stack. */
  ringed?: boolean;
};

export function Avatar({seedKey, size = 32, ringed = false}: Props) {
  return (
    <View
      style={[
        styles.frame,
        {width: size, height: size, borderRadius: size / 2},
        ringed ? styles.ringed : null,
      ]}>
      <SvgXml xml={avatarFor(seedKey)} width={size} height={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    backgroundColor: colors.blueTintBg,
  },
  ringed: {
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
