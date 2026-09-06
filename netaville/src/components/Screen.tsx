import type {ReactNode} from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, spacing} from '@/theme';

type Props = {
  children: ReactNode;
  /** Wrap the content in a ScrollView. */
  scroll?: boolean;
  /** Respect the top safe-area inset (off for screens with their own header). */
  edgeTop?: boolean;
  /** Extra bottom padding, e.g. to clear a sticky action bar. */
  bottomInset?: number;
  /** Pull-to-refresh, for the screens backed by the live feed. */
  refreshControl?: ScrollViewProps['refreshControl'];
  contentStyle?: ViewStyle;
};

export function Screen({
  children,
  scroll = false,
  edgeTop = true,
  bottomInset = 0,
  refreshControl,
  contentStyle,
}: Props) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: edgeTop ? insets.top : 0,
    paddingBottom: bottomInset,
  };

  if (scroll) {
    return (
      <View style={styles.root}>
        <ScrollView
          style={StyleSheet.absoluteFill}
          contentContainerStyle={[styles.content, padding, contentStyle]}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          refreshControl={refreshControl}>
          {children}
        </ScrollView>
      </View>
    );
  }

  return <View style={[styles.root, padding, contentStyle]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
});
