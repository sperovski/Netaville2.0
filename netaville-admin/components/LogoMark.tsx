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
} from '@/lib/logo';

/**
 * The Netaville mark, the same geometry the mobile app's boot animation
 * assembles (netaville/src/components/LogoMark.tsx), rendered as a plain SVG.
 * The wordmark is set in type beside it, not drawn here.
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

export function LogoMark({size = 26}: {size?: number}) {
  return (
    <svg
      width={size * ASPECT}
      height={size}
      viewBox={`${BOX.x} ${BOX.y} ${BOX.width} ${BOX.height}`}
      aria-hidden>
      <g transform={`translate(${MARK_OFFSET.x} ${MARK_OFFSET.y})`}>
        <path d={slabPath} fill={palette.ink} />
        {cyanPaths.map(d => (
          <path key={d} d={d} fill={palette.cyan} />
        ))}
        {greyPaths.map(d => (
          <path key={d} d={d} fill={palette.grey} />
        ))}
        {rayPaths.map(d => (
          <path key={d} d={d} fill={palette.gold} />
        ))}
        {tracePaths.map(d => (
          <path key={d} d={d} fill={palette.coral} />
        ))}
        {tiles.map(tile => (
          <rect
            key={`${tile.x}-${tile.y}`}
            x={tile.x}
            y={tile.y}
            width={tile.width}
            height={tile.height}
            fill={palette.tile}
          />
        ))}
        {corePaths.map((d, index) => (
          <path key={d} d={d} fill={coreFills[index] ?? palette.cyan} />
        ))}
        <circle cx={CORE.cx} cy={CORE.cy} r={CORE.r} fill={palette.ink} />
      </g>
    </svg>
  );
}
