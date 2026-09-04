import {useColorScheme} from 'react-native';

export type Theme = {
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
};

const light: Theme = {
  background: '#f6f7f9',
  card: '#ffffff',
  text: '#11151c',
  muted: '#6b7280',
  border: '#e5e7eb',
  primary: '#2563eb',
};

const dark: Theme = {
  background: '#0b0f14',
  card: '#151b23',
  text: '#f3f4f6',
  muted: '#9ca3af',
  border: '#252d38',
  primary: '#60a5fa',
};

export const spacing = {xs: 4, sm: 8, md: 16, lg: 24, xl: 32} as const;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
