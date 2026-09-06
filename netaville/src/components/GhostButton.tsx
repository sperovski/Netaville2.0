import type {ReactNode} from 'react';
import type {ViewStyle} from 'react-native';
import {PrimaryButton} from './PrimaryButton';

type Props = {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  size?: 'md' | 'sm';
  full?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

/**
 * The quieter of two actions. Kept as its own name because that is what the
 * call sites mean; it is the flat button's `secondary` variant.
 */
export function GhostButton(props: Props) {
  return <PrimaryButton {...props} variant="secondary" />;
}
