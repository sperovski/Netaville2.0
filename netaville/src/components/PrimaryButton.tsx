import type {ReactNode} from 'react';
import type {ViewStyle} from 'react-native';
import {RippleButton} from './RippleButton';

type Props = {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  size?: 'md' | 'sm';
  style?: ViewStyle;
};

/** The app's primary call to action. */
export function PrimaryButton(props: Props) {
  return <RippleButton {...props} />;
}
