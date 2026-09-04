import {StyleSheet, View, type ViewStyle} from 'react-native';
import Svg, {G, Path} from 'react-native-svg';
import {rayPaths, tracePaths} from '@/data/logo';

/**
 * A piece of the logo, blown up and bled off a corner as a background mark.
 * Cards carry the brand this way instead of relying on a flat tint.
 */

const shapes = {
  /** The gold sunburst. */
  rays: {paths: rayPaths, viewBox: '86 3 88 108', originX: 130, originY: 57},
  /** The coral circuit run. */
  traces: {paths: tracePaths, viewBox: '84 112 130 124', originX: 149, originY: 174},
} as const;

export type MotifName = keyof typeof shapes;

type Props = {
  name: MotifName;
  color: string;
  size: number;
  rotation?: number;
  opacity?: number;
  /** Placement of the motif's own box against the card. */
  position: ViewStyle;
};

export function BrandMotif({
  name,
  color,
  size,
  rotation = 0,
  opacity = 0.26,
  position,
}: Props) {
  const shape = shapes[name];

  return (
    <View pointerEvents="none" style={[styles.root, position]}>
      <Svg width={size} height={size} viewBox={shape.viewBox}>
        <G rotation={rotation} originX={shape.originX} originY={shape.originY}>
          {shape.paths.map(d => (
            <Path key={d} d={d} fill={color} opacity={opacity} />
          ))}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {position: 'absolute'},
});
