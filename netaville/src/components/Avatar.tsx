import {StyleSheet, View} from 'react-native';
import {SvgXml} from 'react-native-svg';
import {avatarBySeed, avatarFor, type AvatarSeed} from '@/data/avatars';
import {colors} from '@/theme';

type Props = {
  /** Any stable string — the same key always yields the same face. */
  seedKey: string;
  size?: number;
  /** White ring, used when avatars overlap in a stack. */
  ringed?: boolean;
  /** A face the user picked, which wins over the one derived from seedKey. */
  seed?: AvatarSeed | null;
};

export function Avatar({seedKey, size = 32, ringed = false, seed}: Props) {
  const xml = seed == null ? avatarFor(seedKey) : avatarBySeed(seed);

  return (
    <View
      style={[
        styles.frame,
        {width: size, height: size, borderRadius: size / 2},
        ringed ? styles.ringed : null,
      ]}>
      <SvgXml xml={xml} width={size} height={size} />
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
