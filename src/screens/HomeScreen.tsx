import React from 'react';
import {Button, Text, StyleSheet} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Card} from '@/components/Card';
import {Screen} from '@/components/Screen';
import {useTheme} from '@/theme';
import type {HomeStackParamList} from '@/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

export function HomeScreen({navigation}: Props) {
  const theme = useTheme();

  return (
    <Screen scroll>
      <Text style={[styles.heading, {color: theme.text}]}>Netaville</Text>
      <Card
        title="Welcome"
        subtitle="This scaffold is wired and ready to build on.">
        <Button
          title="Open details"
          color={theme.primary}
          onPress={() => navigation.navigate('Details', {id: 'demo-1'})}
        />
      </Card>
      <Card
        title="Next steps"
        subtitle="Point src/api/config.ts at your backend, then replace these screens."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {fontSize: 28, fontWeight: '700'},
});
