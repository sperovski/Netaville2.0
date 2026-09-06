import Svg, {Rect} from 'react-native-svg';

/**
 * Microsoft's four-square logo, in their brand colours. The sign-in button has
 * to carry the real mark — lucide has no logo glyphs, and a generic envelope
 * would not tell anyone which account to use.
 */
export function MicrosoftMark({size = 18}: {size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <Rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <Rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <Rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </Svg>
  );
}
