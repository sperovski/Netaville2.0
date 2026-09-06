import Svg, {Circle, Path} from 'react-native-svg';
import type {Tier} from '@/data/loyalty';

/**
 * The tier coin, drawn — not the three PNGs this used to load.
 *
 * Those were the only bitmap asset in an otherwise all-SVG app (everything
 * else — the logo, avatars, brand motifs — is a vector), and they went blank
 * intermittently: a `require()`'d local image can lose its decoded bitmap
 * under memory pressure or after the app returns from background, and nothing
 * here forces a reload when that happens. A vector has no decode step to lose
 * — it is redrawn from the same path data every time, so there is nothing to
 * go blank.
 *
 * One shape, three palettes, rather than three separate coins: the medals
 * only ever differed in colour, and keeping one geometry is what makes them
 * read as a matched set at every size, from a 14px inline badge to the 34px
 * tier row.
 */

type Palette = {
  /** The offset duplicate behind the coin — the "stack of coins" edge. */
  shadow: string;
  base: string;
  ring: string;
  star: string;
  /** Bronze reads flatter without the sparkle; the others keep it. */
  sparkle?: string;
};

const palettes: Record<Tier['name'], Palette> = {
  Bronze: {
    shadow: '#7A4A24',
    base: '#B2703A',
    ring: '#8C5429',
    star: '#DDA15E',
    sparkle: '#FFFFFF',
  },
  Gold: {
    shadow: '#E0A400',
    base: '#F5B301',
    ring: '#FBCB4D',
    star: '#FFFFFF',
    sparkle: '#FFFFFF',
  },
  Platinum: {
    shadow: '#9AA3BE',
    base: '#C4CADA',
    ring: '#FFFFFF',
    star: '#8892AD',
  },
};

type Props = {
  tier: Tier['name'];
  size?: number;
};

export function TierMedal({tier, size = 22}: Props) {
  const palette = palettes[tier];

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" style={styles.medal}>
      {/* the stacked-coin edge, peeking from behind */}
      <Circle cx={17.1} cy={17.1} r={13.4} fill={palette.shadow} />
      <Circle cx={15} cy={15} r={13.4} fill={palette.base} />
      <Circle
        cx={15}
        cy={15}
        r={9.4}
        fill="none"
        stroke={palette.ring}
        strokeWidth={2.2}
      />
      <Path
        d="M15 8.6l2.05 4.16 4.59.67-3.32 3.24.78 4.57L15 19.03l-4.1 2.16.78-4.57-3.32-3.24 4.59-.67L15 8.6z"
        fill={palette.star}
      />
      {palette.sparkle === undefined ? null : (
        <Path
          d="M22.4 6.2l1.1 2.4 2.4 1.1-2.4 1.1-1.1 2.4-1.1-2.4-2.4-1.1 2.4-1.1 1.1-2.4z"
          fill={palette.sparkle}
        />
      )}
    </Svg>
  );
}

const styles = {
  // Matches the old Image's flexShrink: 0 — an explicit-size SVG doesn't need
  // it to render correctly, but it stops a flex row squeezing the coin if one
  // ever gets tight.
  medal: {flexShrink: 0 as const},
};
