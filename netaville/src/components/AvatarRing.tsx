import {StyleSheet, View} from 'react-native';
import Svg, {Circle, G} from 'react-native-svg';
import {Avatar} from './Avatar';
import {TierMedal} from './TierMedal';
import type {Tier} from '@/data/loyalty';
import {colors} from '@/theme';

type Props = {
  seedKey: string;
  tier: Tier;
  /** Progress towards the next tier, 0–1. */
  progress: number;
  size?: number;
};

const STROKE = 4;
const GAP = 9; // breathing room between the avatar and its ring

/**
 * The avatar wearing its tier: a progress ring towards the next tier, a faint
 * dotted orbit for depth, and the tier medal pinned to the corner.
 */
export function AvatarRing({seedKey, tier, progress, size = 96}: Props) {
  const ring = size + GAP * 2;
  const radius = (ring - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const orbit = ring + 12;
  const orbitRadius = (orbit - 1) / 2;

  return (
    <View style={[styles.root, {width: orbit, height: orbit}]}>
      {/* dotted orbit */}
      <Svg width={orbit} height={orbit} style={StyleSheet.absoluteFill}>
        <Circle
          cx={orbit / 2}
          cy={orbit / 2}
          r={orbitRadius}
          stroke={colors.blueTintBorder}
          strokeWidth={1}
          strokeDasharray="2 6"
          strokeLinecap="round"
          fill="none"
        />
      </Svg>

      {/* tier progress ring */}
      <Svg width={ring} height={ring}>
        <G rotation={-90} originX={ring / 2} originY={ring / 2}>
          <Circle
            cx={ring / 2}
            cy={ring / 2}
            r={radius}
            stroke={colors.blueTintBg}
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={ring / 2}
            cy={ring / 2}
            r={radius}
            stroke={tier.color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - Math.max(0, Math.min(1, progress)))}
            fill="none"
          />
        </G>
      </Svg>

      <View style={styles.avatar}>
        <Avatar seedKey={seedKey} size={size} />
      </View>

      {/* tier medal, pinned to the corner */}
      <View style={styles.medal}>
        <TierMedal tier={tier.name} size={30} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {alignItems: 'center', justifyContent: 'center'},
  avatar: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.blueTintBg,
  },
  medal: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
