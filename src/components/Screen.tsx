import React, {type PropsWithChildren} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {spacing, useTheme} from '@/theme';

type Props = PropsWithChildren<{scroll?: boolean}>;

export function Screen({children, scroll = false}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const style = [
    styles.container,
    {backgroundColor: theme.background, paddingTop: insets.top},
  ];

  if (scroll) {
    return (
      <ScrollView style={style} contentContainerStyle={styles.content}>
        {children}
      </ScrollView>
    );
  }

  return <View style={[style, styles.content]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: spacing.md, gap: spacing.md},
});
