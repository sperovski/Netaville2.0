import {StyleSheet, Text, View} from 'react-native';
import {LogoMark} from './LogoMark';
import {colors, fonts} from '@/theme';

export function Wordmark() {
  return (
    <View style={styles.row}>
      <LogoMark size={30} />
      <Text style={styles.word}>Netaville</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: 10},
  word: {
    fontFamily: fonts.extrabold,
    fontSize: 18,
    letterSpacing: -0.5,
    color: colors.textInk,
  },
});
