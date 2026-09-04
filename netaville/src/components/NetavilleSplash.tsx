import {useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type EasingFunction,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  Rect,
  Stop,
  LinearGradient,
} from 'react-native-svg';
import {
  CORE,
  MARK_OFFSET,
  VIEW_BOX,
  corePaths,
  cyanPaths,
  glyphPaths,
  greyPaths,
  palette,
  rayCentres,
  rayPaths,
  slabPath,
  tiles,
  tracePaths,
} from '@/data/logo';
import {colors, fonts, spacing} from '@/theme';

/**
 * The boot sequence from netaville-intro.html, ported 1:1.
 *
 * Every beat keeps the original delay, duration and easing curve; the last one
 * (the mark settling) ends at 3.3s, at which point `onComplete` fires.
 *
 * Each animated piece is its own absolutely-positioned <Svg> inside an
 * Animated.View. That lets every transform run on the native driver — the JS
 * thread is busy bootstrapping the app while this plays, and a JS-driven
 * animation would stutter exactly when it matters.
 */

const SEQUENCE_END = 3300;

/** cubic-bezier() curves lifted from the stylesheet. */
const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  sweep: Easing.bezier(0.5, 0, 0.2, 1),
  fan: Easing.bezier(0.2, 0.9, 0.3, 1),
  pop: Easing.bezier(0.2, 1.6, 0.4, 1),
  core: Easing.bezier(0.2, 1.6, 0.35, 1),
  shock: Easing.bezier(0.2, 0.6, 0.2, 1),
  settle: Easing.bezier(0.2, 1.35, 0.35, 1),
  linearOut: Easing.out(Easing.ease),
};

type Step = {delay: number; duration: number; easing: EasingFunction};

const steps = {
  sweep: {delay: 80, duration: 1050, easing: ease.sweep},
  slab: {delay: 220, duration: 550, easing: ease.out},
  cyan: {delay: 520, duration: 600, easing: ease.out},
  yellow: {delay: 580, duration: 600, easing: ease.out},
  grey: {delay: 620, duration: 600, easing: ease.out},
  coral: {delay: 680, duration: 600, easing: ease.out},
  coreFan: {delay: 800, duration: 400, easing: ease.linearOut},
  core: {delay: 1720, duration: 500, easing: ease.core},
  shock: {delay: 1850, duration: 950, easing: ease.shock},
  settle: {delay: 2450, duration: 850, easing: ease.settle},
  quote: {delay: 2600, duration: 700, easing: ease.out},
  flash: {delay: 2500, duration: 500, easing: ease.linearOut},
} satisfies Record<string, Step>;

const rayDelays = [1140, 1210, 1280, 1350, 1420, 1490];
const dotDelays = [1240, 1290, 1340, 1390, 1440, 1490];
const traceDelays = [1300, 1370, 1440, 1510, 1580, 1650];
const glyphDelays = [2020, 2070, 2120, 2170, 2220, 2270, 2320, 2370, 2420, 2470];

function useDrivers(count: number, done: boolean) {
  return useMemo(
    () => Array.from({length: count}, () => new Animated.Value(done ? 1 : 0)),
    [count, done],
  );
}

const DEFAULT_QUOTE = 'Build something small. Bring someone with you.';

type Props = {
  /** Fires once the sequence finishes (or immediately under reduced motion). */
  onComplete?: () => void;
  /** True while the app is still bootstrapping — drives the looping hold state. */
  holding?: boolean;
  /** Line shown under the mark once the wordmark has risen. */
  quote?: string;
};

export function NetavilleSplash({
  onComplete,
  holding = false,
  quote = DEFAULT_QUOTE,
}: Props) {
  const {width, height} = useWindowDimensions();
  // Leave room under the square stage for the quote.
  const size = Math.min(width * 0.8, height * 0.5);
  const unit = size / VIEW_BOX;

  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const finished = reduceMotion === true;

  const sweep = useDrivers(1, finished)[0]!;
  const slab = useDrivers(1, finished)[0]!;
  const cyan = useDrivers(1, finished)[0]!;
  const grey = useDrivers(1, finished)[0]!;
  const yellow = useDrivers(1, finished)[0]!;
  const coral = useDrivers(1, finished)[0]!;
  const coreFan = useDrivers(1, finished)[0]!;
  const core = useDrivers(1, finished)[0]!;
  const shock = useDrivers(1, finished)[0]!;
  const flash = useDrivers(1, finished)[0]!;
  const settle = useDrivers(1, finished)[0]!;
  const quoteIn = useDrivers(1, finished)[0]!;
  const rays = useDrivers(rayPaths.length, finished);
  const dots = useDrivers(tiles.length, finished);
  const traces = useDrivers(tracePaths.length, finished);
  const glyphs = useDrivers(glyphPaths.length, finished);

  const pulse = useRef(new Animated.Value(0)).current;
  const [sequenceDone, setSequenceDone] = useState(false);
  const completed = useRef(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (active) {
          setReduceMotion(value);
        }
      })
      .catch(() => setReduceMotion(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion === null || completed.current) {
      return;
    }

    // Reduced motion: the finished logo, no movement, callback on the next tick.
    if (reduceMotion) {
      completed.current = true;
      setSequenceDone(true);
      onComplete?.();
      return;
    }

    const run = (value: Animated.Value, step: Step, delay = step.delay) =>
      Animated.timing(value, {
        toValue: 1,
        duration: step.duration,
        delay,
        easing: step.easing,
        useNativeDriver: true,
      });

    const stagger = (
      values: Animated.Value[],
      delays: number[],
      duration: number,
      easing: EasingFunction,
    ) =>
      values.map((value, index) =>
        Animated.timing(value, {
          toValue: 1,
          duration,
          delay: delays[index] ?? 0,
          easing,
          useNativeDriver: true,
        }),
      );

    const animation = Animated.parallel([
      run(sweep, steps.sweep),
      run(slab, steps.slab),
      run(cyan, steps.cyan),
      run(grey, steps.grey),
      run(yellow, steps.yellow),
      run(coral, steps.coral),
      run(coreFan, steps.coreFan),
      run(core, steps.core),
      run(shock, steps.shock),
      run(settle, steps.settle),
      run(flash, steps.flash),
      run(quoteIn, steps.quote),
      ...stagger(rays, rayDelays, 500, ease.fan),
      ...stagger(dots, dotDelays, 320, ease.pop),
      ...stagger(traces, traceDelays, 450, ease.linearOut),
      ...stagger(glyphs, glyphDelays, 550, ease.out),
    ]);

    animation.start(({finished: ended}) => {
      if (!ended || completed.current) {
        return;
      }
      completed.current = true;
      setSequenceDone(true);
      onComplete?.();
    });

    return () => animation.stop();
    // The drivers are stable for a given reduced-motion state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  // Bootstrapping outlasted the intro: drop to a quietly pulsing core.
  useEffect(() => {
    if (!sequenceDone || !holding || reduceMotion) {
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sequenceDone, holding, reduceMotion, pulse]);

  const holdingNow = sequenceDone && holding;

  /** Scale about an arbitrary point, the way `transform-origin: center` did. */
  const originScale = (
    driver: Animated.Value,
    from: number,
    to: number,
    centre: {x: number; y: number},
    offset: {x: number; y: number} = {x: 0, y: 0},
  ) => {
    const dx = (centre.x + MARK_OFFSET.x - VIEW_BOX / 2) * unit;
    const dy = (centre.y + MARK_OFFSET.y - VIEW_BOX / 2) * unit;
    return [
      {
        translateX: driver.interpolate({
          inputRange: [0, 1],
          outputRange: [(1 - from) * dx + offset.x * unit, (1 - to) * dx],
        }),
      },
      {
        translateY: driver.interpolate({
          inputRange: [0, 1],
          outputRange: [(1 - from) * dy + offset.y * unit, (1 - to) * dy],
        }),
      },
      {
        scale: driver.interpolate({inputRange: [0, 1], outputRange: [from, to]}),
      },
    ];
  };

  const slide = (driver: Animated.Value, axis: 'x' | 'y', from: number) => [
    axis === 'x'
      ? {
          translateX: driver.interpolate({
            inputRange: [0, 1],
            outputRange: [from * unit, 0],
          }),
        }
      : {
          translateY: driver.interpolate({
            inputRange: [0, 1],
            outputRange: [from * unit, 0],
          }),
        },
  ];

  const stage = {width: size, height: size};

  // A layer is one full-canvas SVG; they stack pixel-for-pixel.
  const layer = [StyleSheet.absoluteFill, stage] as const;

  const hideAfterHold = {
    opacity: holdingNow ? 0 : 1,
  };

  return (
    <View style={[styles.root, {backgroundColor: colors.bg}]}>
      <View style={[styles.stage, stage]}>
        {/* scan sweep */}
        <Animated.View
          pointerEvents="none"
          style={[
            layer,
            styles.sweep,
            {
              opacity: holdingNow
                ? 0
                : sweep.interpolate({
                    inputRange: [0, 0.12, 0.88, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
              transform: [
                {
                  translateY: sweep.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, size],
                  }),
                },
              ],
            },
          ]}>
          <Svg width={size} height={4}>
            <Defs>
              <LinearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={palette.cyan} stopOpacity={0} />
                <Stop offset="0.5" stopColor={palette.cyan} stopOpacity={1} />
                <Stop offset="1" stopColor={palette.cyan} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={size} height={2} fill="url(#sweep)" />
          </Svg>
        </Animated.View>

        {/* the mark — everything below settles together */}
        <Animated.View
          pointerEvents="none"
          style={[
            layer,
            {
              transform: [
                {
                  scale: settle.interpolate({
                    inputRange: [0, 0.6, 1],
                    outputRange: [1.035, 0.997, 1],
                  }),
                },
              ],
            },
          ]}>
          {/* blue slab */}
          <Animated.View
            style={[
              layer,
              {
                opacity: slab,
                transform: originScale(slab, 0.86, 1, {
                  x: 108.25,
                  y: 119.15,
                }),
              },
            ]}>
            <Mark size={size}>
              <Path d={slabPath} fill={palette.ink} />
            </Mark>
          </Animated.View>

          {/* cyan panel, in from the left */}
          <Animated.View
            style={[layer, {opacity: cyan, transform: slide(cyan, 'x', -130)}]}>
            <Mark size={size}>
              {cyanPaths.map(d => (
                <Path key={d} d={d} fill={palette.cyan} />
              ))}
            </Mark>
          </Animated.View>

          {/* grey panel, in from the left */}
          <Animated.View
            style={[layer, {opacity: grey, transform: slide(grey, 'x', -130)}]}>
            <Mark size={size}>
              {greyPaths.map(d => (
                <Path key={d} d={d} fill={palette.grey} />
              ))}
            </Mark>
          </Animated.View>

          {/* gold rays, group drops in then each ray fans out */}
          <Animated.View
            style={[layer, {opacity: yellow, transform: slide(yellow, 'y', -140)}]}>
            {rayPaths.map((d, index) => (
              <Animated.View
                key={d}
                style={[
                  layer,
                  {
                    opacity: rays[index]!,
                    transform: originScale(
                      rays[index]!,
                      0.9,
                      1,
                      rayCentres[index] ?? {x: 130, y: 55},
                      {x: -14, y: 10},
                    ),
                  },
                ]}>
                <Mark size={size}>
                  <Path d={d} fill={palette.gold} />
                </Mark>
              </Animated.View>
            ))}
          </Animated.View>

          {/* coral circuit traces, group in from the right */}
          <Animated.View
            style={[layer, {opacity: coral, transform: slide(coral, 'x', 150)}]}>
            {tracePaths.map((d, index) => (
              <Animated.View key={d} style={[layer, {opacity: traces[index]!}]}>
                <Mark size={size}>
                  <Path d={d} fill={palette.coral} />
                </Mark>
              </Animated.View>
            ))}
          </Animated.View>

          {/* white circuit blocks */}
          {tiles.map((tile, index) => (
            <Animated.View
              key={`${tile.x}-${tile.y}`}
              style={[
                layer,
                {
                  opacity: dots[index]!,
                  transform: originScale(dots[index]!, 0, 1, {
                    x: tile.x + tile.width / 2,
                    y: tile.y + tile.height / 2,
                  }),
                },
              ]}>
              <Mark size={size}>
                <Rect
                  x={tile.x}
                  y={tile.y}
                  width={tile.width}
                  height={tile.height}
                  fill={palette.tile}
                />
              </Mark>
            </Animated.View>
          ))}

          {/* four-colour core fan */}
          <Animated.View style={[layer, {opacity: coreFan}]}>
            <Mark size={size}>
              {corePaths.map((d, index) => (
                <Path
                  key={d}
                  d={d}
                  fill={
                    [palette.cyan, palette.gold, palette.coral, palette.grey][index] ??
                    palette.cyan
                  }
                />
              ))}
            </Mark>
          </Animated.View>

          {/* shockwave */}
          <Animated.View
            style={[
              layer,
              {
                opacity: shock.interpolate({inputRange: [0, 1], outputRange: [0.9, 0]}),
                transform: originScale(shock, 1, 3.2, {x: CORE.cx, y: CORE.cy}),
              },
            ]}>
            <Mark size={size}>
              <Circle
                cx={CORE.cx}
                cy={CORE.cy}
                r={CORE.r}
                fill="none"
                stroke={palette.cyan}
                strokeWidth={3}
              />
            </Mark>
          </Animated.View>

          {/* core circle — the piece that keeps pulsing if boot runs long */}
          <Animated.View
            style={[
              layer,
              {
                transform: holdingNow
                  ? originScale(pulse, 1, 1.12, {x: CORE.cx, y: CORE.cy})
                  : [
                      ...originScale(core, 0, 1, {x: CORE.cx, y: CORE.cy}).slice(0, 2),
                      {
                        scale: core.interpolate({
                          inputRange: [0, 0.7, 1],
                          outputRange: [0, 1.16, 1],
                        }),
                      },
                    ],
              },
            ]}>
            <Mark size={size}>
              <Circle cx={CORE.cx} cy={CORE.cy} r={CORE.r} fill={palette.ink} />
            </Mark>
          </Animated.View>

          {/* wordmark letters rising */}
          <Animated.View style={[layer, hideAfterHold]}>
            {glyphPaths.map((d, index) => (
              <Animated.View
                key={d}
                style={[
                  layer,
                  {
                    opacity: glyphs[index]!,
                    transform: slide(glyphs[index]!, 'y', 46),
                  },
                ]}>
                <Mark size={size}>
                  <Path d={d} fill={palette.ink} />
                </Mark>
              </Animated.View>
            ))}
          </Animated.View>
        </Animated.View>

        {/* flash */}
        <Animated.View
          pointerEvents="none"
          style={[
            layer,
            styles.flash,
            {
              opacity: flash.interpolate({
                inputRange: [0, 0.18, 1],
                outputRange: [0, 0.8, 0],
              }),
            },
          ]}
        />
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.quoteWrap,
          {
            width: size,
            opacity: quoteIn,
            transform: [
              {
                translateY: quoteIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
            ],
          },
        ]}>
        <Text style={styles.quote}>{quote}</Text>
      </Animated.View>
    </View>
  );
}

/** One canvas of the mark, already offset by the original translate(92,81). */
function Mark({size, children}: {size: number; children: React.ReactNode}) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}>
      <G x={MARK_OFFSET.x} y={MARK_OFFSET.y}>
        {children}
      </G>
    </Svg>
  );
}

export {SEQUENCE_END as SPLASH_DURATION};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {overflow: 'hidden'},
  quoteWrap: {paddingHorizontal: spacing.xl, marginTop: -spacing.xl},
  quote: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0.1,
    textAlign: 'center',
    color: colors.textMuted,
  },
  sweep: {height: 4},
  flash: {backgroundColor: '#fff'},
});
