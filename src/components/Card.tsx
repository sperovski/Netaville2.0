import React, {type PropsWithChildren} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {spacing, useTheme} from '@/theme';

type Props = PropsWithChildren<{title: string; subtitle?: string}>;

export function Card({title, subtitle, children}: Props) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {backgroundColor: theme.card, borderColor: theme.border},
      ]}>
      <Text style={[styles.title, {color: theme.text}]}>{title}</Text>
      {subtitle === undefined ? null : (
        <Text style={[styles.subtitle, {color: theme.muted}]}>{subtitle}</Text>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {fontSize: 17, fontWeight: '600'},
  subtitle: {fontSize: 14, lineHeight: 20},
});
