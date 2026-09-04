import {useRef, useState, type ReactNode} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {colors, fonts, radii, spacing} from '@/theme';

/**
 * The Uiverse "expanding circle" button, adapted for touch.
 *
 * The web original grows the circle on :hover, which phones don't have — so the
 * ripple runs on press-in and retracts on release, and the CSS :active scale
 * rides along with it.
 */

type Props = {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
  size?: 'md' | 'sm';
  background?: string;
  rippleColor?: string;
  style?: ViewStyle;
};

const EXPAND_EASING = Easing.bezier(0, 0, 0.2, 1);

export function RippleButton({
  label,
  onPress,
  icon,
  size = 'md',
  background = colors.brandBlue,
  rippleColor = 'rgba(1, 190, 254, 0.6)',
  style,
}: Props) {
  const press = useRef(new Animated.Value(0)).current;
  const [box, setBox] = useState({width: 0, height: 0});

  // The CSS circle ends at 14em; here it just has to outgrow the button.
  const diameter = Math.max(box.width, box.height) * 2.2 || 240;

  const animate = (toValue: number, duration: number) =>
    Animated.timing(press, {
      toValue,
      duration,
      easing: EXPAND_EASING,
      useNativeDriver: true,
    }).start();

  const onLayout = (event: LayoutChangeEvent) => {
    const {width, height} = event.nativeEvent.layout;
    setBox({width, height});
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => animate(1, 500)}
      onPressOut={() => animate(0, 400)}
      onLayout={onLayout}
      style={style}>
      <Animated.View
        style={[
          styles.button,
          size === 'sm' ? styles.sm : styles.md,
          {
            backgroundColor: background,
            transform: [
              {
                scale: press.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.97],
                }),
              },
            ],
          },
        ]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ripple,
            {
              width: diameter,
              height: diameter,
              borderRadius: diameter / 2,
              backgroundColor: rippleColor,
              marginLeft: -diameter / 2,
              marginTop: -diameter / 2,
              transform: [{scale: press}],
            },
          ]}
        />

        {/* the darkening sheen from the original's .gradient layer */}
        <View pointerEvents="none" style={styles.sheen}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000" stopOpacity={0} />
                <Stop offset="0.5" stopColor="#000" stopOpacity={0} />
                <Stop offset="1" stopColor="#000" stopOpacity={0.3} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#sheen)" />
          </Svg>
        </View>

        <View style={styles.inner}>
          {icon}
          <Animated.Text
            style={[styles.label, size === 'sm' ? styles.labelSm : null]}
            numberOfLines={1}>
            {label}
          </Animated.Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  md: {paddingVertical: 14, paddingHorizontal: spacing.xl},
  sm: {paddingVertical: 9, paddingHorizontal: 16},
  ripple: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  sheen: {
    position: 'absolute',
    top: -4,
    left: 0,
    right: 0,
    bottom: 0,
  },
  inner: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  label: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.textOnBrand,
    letterSpacing: -0.1,
  },
  labelSm: {fontSize: 13},
});
