import React from 'react';
import {Card} from '@/components/Card';
import {Screen} from '@/components/Screen';
import {API_BASE_URL} from '@/api/config';

export function SettingsScreen() {
  return (
    <Screen>
      <Card title="Settings" subtitle="Placeholder for app preferences." />
      <Card title="API endpoint" subtitle={API_BASE_URL} />
    </Screen>
  );
}
