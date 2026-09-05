import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppIcon} from '@/components/AppIcon';
import {BrandMotif} from '@/components/BrandMotif';
import {GoogleMark} from '@/components/GoogleMark';
import {LogoMark} from '@/components/LogoMark';
import {RippleButton} from '@/components/RippleButton';
import {useAuth} from '@/context/auth';
import {colors, fonts, radii, spacing} from '@/theme';
import type {AppIconName} from '@/data/appIcons';

/**
 * The way into the app. A brand panel carries the pitch, a white sheet slides
 * under it with the one thing to do — no form, no password, one account path.
 */

type Perk = {
  icon: AppIconName;
  title: string;
  body: string;
  tint: string;
  ink: string;
};

// Blue, coral, gold — the same three accents the app colour-codes sections with.
const perks: Perk[] = [
  {
    icon: 'card',
    title: 'Collect stamps',
    body: 'Ten cups, one free coffee.',
    tint: colors.blueTintBg,
    ink: colors.brandBlue,
  },
  {
    icon: 'events',
    title: 'Come to events',
    body: 'Quiz nights, workshops, game nights.',
    tint: colors.coralTintBg,
    ink: colors.coralText,
  },
  {
    icon: 'ranks',
    title: 'Climb the ranks',
    body: 'Bronze to Platinum, on the leaderboard.',
    tint: colors.goldChipBg,
    ink: colors.gold,
  },
];

export default function SignInScreen() {
  const {signIn, busy, error} = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={[styles.panel, {paddingTop: insets.top + spacing.xxl}]}>
        <BrandMotif
          name="rays"
          color={colors.gold}
          size={168}
          rotation={202}
          opacity={0.9}
          position={styles.rays}
        />
        <BrandMotif
          name="traces"
          color={colors.cyan}
          size={200}
          rotation={18}
          opacity={0.3}
          position={styles.traces}
        />

        <View style={styles.wordmark}>
          <LogoMark size={30} />
          <Text style={styles.wordmarkText}>Netaville</Text>
        </View>

        <View style={styles.copy}>
          <Text style={styles.headline}>
            Coffee, events{'\n'}and a card that{'\n'}counts.
          </Text>
          <Text style={styles.sub}>
            Free to join. One tap, no password to remember.
          </Text>
        </View>
      </View>

      <View style={[styles.sheet, {paddingBottom: insets.bottom + spacing.xl}]}>
        <View style={styles.perks}>
          {perks.map(perk => (
            <View key={perk.title} style={styles.perk}>
              <View style={[styles.perkIcon, {backgroundColor: perk.tint}]}>
                <AppIcon name={perk.icon} color={perk.ink} size={19} />
              </View>
              <View style={styles.perkBody}>
                <Text style={styles.perkTitle}>{perk.title}</Text>
                <Text style={styles.perkText}>{perk.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <RippleButton
            label={busy ? 'Signing in…' : 'Continue with Google'}
            onPress={busy ? undefined : () => void signIn()}
            icon={
              busy ? (
                <ActivityIndicator size="small" color={colors.textInk} />
              ) : (
                <GoogleMark size={19} />
              )
            }
            background={colors.surface}
            rippleColor="rgba(43, 31, 201, 0.09)"
            labelColor={colors.textInk}
            sheen={false}
            style={styles.cta}
          />

          {error === null ? null : <Text style={styles.error}>{error}</Text>}

          <Text style={styles.legal}>
            We only ever read your name and email address.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.brandBlue},
  panel: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl + spacing.xl,
    gap: spacing.xl,
    overflow: 'hidden',
  },
  rays: {top: -48, right: -40},
  traces: {bottom: -70, left: -64},
  wordmark: {flexDirection: 'row', alignItems: 'center', gap: 10},
  wordmarkText: {
    fontFamily: fonts.extrabold,
    fontSize: 19,
    letterSpacing: -0.5,
    color: colors.textOnBrand,
  },
  copy: {gap: spacing.md},
  sub: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.74)',
  },
  headline: {
    fontFamily: fonts.extrabold,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1.2,
    color: colors.textOnBrand,
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },
  perks: {flex: 1, justifyContent: 'center', gap: spacing.md},
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.cardSm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg - 2,
  },
  perkIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkBody: {flex: 1, gap: 1},
  perkTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: -0.2,
    color: colors.textInk,
  },
  perkText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  actions: {gap: spacing.md},
  cta: {
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.danger,
  },
  legal: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textDim,
    textAlign: 'center',
  },
});
