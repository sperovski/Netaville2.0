import type {ColorValue} from 'react-native';
import Svg, {Path} from 'react-native-svg';
import {appIcons, type AppIconName} from '@/data/appIcons';

type Props = {
  name: AppIconName;
  color: ColorValue;
  size?: number;
};

/** An icon drawn from the project's own SVG artwork. */
export function AppIcon({name, color, size = 22}: Props) {
  const icon = appIcons[name];

  return (
    <Svg width={size} height={size} viewBox={icon.viewBox}>
      {icon.paths.map(d => (
        <Path key={d} d={d} fill={color as string} />
      ))}
    </Svg>
  );
}
