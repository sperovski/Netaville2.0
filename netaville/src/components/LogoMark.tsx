import Svg, {Circle, G, Path, Rect} from 'react-native-svg';
import {
  CORE,
  MARK_OFFSET,
  corePaths,
  cyanPaths,
  greyPaths,
  palette,
  rayPaths,
  slabPath,
  tiles,
  tracePaths,
} from '@/data/logo';

/**
 * The Netaville mark on its own — the same geometry the boot animation
 * assembles, minus the wordmark (which is set in type next to it).
 */

// Tight around the mark: the slab's bounds, shifted by the group's translate.
const BOX = {
  x: MARK_OFFSET.x + 1.5,
  y: MARK_OFFSET.y + 0.8,
  width: 213.5,
  height: 236.7,
};

const ASPECT = BOX.width / BOX.height;

const coreFills = [palette.cyan, palette.gold, palette.coral, palette.grey];

export function LogoMark({size = 30}: {size?: number}) {
  return (
    <Svg
      width={size * ASPECT}
      height={size}
      viewBox={`${BOX.x} ${BOX.y} ${BOX.width} ${BOX.height}`}>
      <G x={MARK_OFFSET.x} y={MARK_OFFSET.y}>
        <Path d={slabPath} fill={palette.ink} />
        {cyanPaths.map(d => (
          <Path key={d} d={d} fill={palette.cyan} />
        ))}
        {greyPaths.map(d => (
          <Path key={d} d={d} fill={palette.grey} />
        ))}
        {rayPaths.map(d => (
          <Path key={d} d={d} fill={palette.gold} />
        ))}
        {tracePaths.map(d => (
          <Path key={d} d={d} fill={palette.coral} />
        ))}
        {tiles.map(tile => (
          <Rect
            key={`${tile.x}-${tile.y}`}
            x={tile.x}
            y={tile.y}
            width={tile.width}
            height={tile.height}
            fill={palette.tile}
          />
        ))}
        {corePaths.map((d, index) => (
          <Path key={d} d={d} fill={coreFills[index] ?? palette.cyan} />
        ))}
        <Circle cx={CORE.cx} cy={CORE.cy} r={CORE.r} fill={palette.ink} />
      </G>
    </Svg>
  );
}
