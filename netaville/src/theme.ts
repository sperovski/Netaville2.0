/**
 * Netaville design tokens. Nothing in the app hardcodes a colour — it comes
 * from here.
 */

export const colors = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#EEE3CD',
  divider: '#F0E7D3',

  textInk: '#241F6B',
  textMuted: '#7C7266',
  textDim: '#ADA593',
  textOnBrand: '#FFFFFF',

  brandBlue: '#2B1FC9',
  blueTintBg: '#E7E4FB',
  blueTintBorder: '#CFCBF0',

  /** The featured "next up" card — the brand violet, one step softer. */
  featureBg: '#EFECFC',
  featureBorder: '#D2CCF2',
  featureRay: '#2B1FC9',
  featureText: '#5B54A6',

  coral: '#F26A57',
  coralTintBg: '#FBE1DB',
  coralTintBorder: '#F5C7BC',
  coralText: '#B24B39',

  gold: '#F5B301',
  goldCardBg: '#FDEFC4',
  goldCardBorder: '#F3DB8A',
  goldChipBg: '#FBEFD6',
  goldChipBorder: '#EFDFB8',
  goldText: '#8A7E63',

  cyan: '#17B9DF',
  cyanTintBg: '#D8F2FB',
  cyanTintBorder: '#A6E4F2',
  cyanText: '#1481A0',

  danger: '#E0553F',
} as const;

export const radii = {
  card: 16,
  cardSm: 14,
  control: 12,
  iconButton: 11,
  chip: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const fonts = {
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semibold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
  extrabold: 'Montserrat_800ExtraBold',
} as const;

export const type = {
  display: {
    fontFamily: fonts.extrabold,
    fontSize: 28,
    letterSpacing: -0.6,
    color: colors.textInk,
  },
  h1: {
    fontFamily: fonts.extrabold,
    fontSize: 25,
    letterSpacing: -0.6,
    color: colors.textInk,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    letterSpacing: -0.3,
    color: colors.textInk,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: -0.2,
    color: colors.textInk,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  bodyStrong: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textInk,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
} as const;

/** Shared lucide-react-native icon settings — thin line style. */
export const icon = {
  strokeWidth: 1.9,
  size: 18,
} as const;

export const hairline = 1;
