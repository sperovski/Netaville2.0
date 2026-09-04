import React from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Card} from '@/components/Card';
import {Screen} from '@/components/Screen';
import type {HomeStackParamList} from '@/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Details'>;

export function DetailsScreen({route}: Props) {
  return (
    <Screen>
      <Card title="Details" subtitle={`Showing item ${route.params.id}`} />
    </Screen>
  );
}
