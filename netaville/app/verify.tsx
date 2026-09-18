import {useEffect, useRef, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ArrowLeft} from 'lucide-react-native';
import {BrandMotif} from '@/components/BrandMotif';
import {LogoMark} from '@/components/LogoMark';
import {PrimaryButton} from '@/components/PrimaryButton';
import {useAuth} from '@/context/auth';
import {colors, fonts, icon, radii, spacing} from '@/theme';

const CODE_LENGTH = 6;
/** Matches MAX_ATTEMPTS in netaville-admin/lib/emailVerification.ts. */
const MAX_ATTEMPTS = 5;
/** How long the resend link stays disabled after it is used. */
const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Step two of joining: the six-digit code that was mailed to the address.
 *
 * A single hidden input drives six boxes — it keeps the OS one-time-code
 * autofill working (which a box-per-digit layout breaks) while still looking
 * like a segmented field. Getting it right hands back a real session and the
 * guard swaps to the app.
 */
export default function VerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {verifyEmailCode, resendCode, busy, error, clearError} = useAuth();
  const params = useLocalSearchParams<{email?: string}>();
  const email = typeof params.email === 'string' ? params.email : '';

  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [resentAt, setResentAt] = useState<number | null>(null);

  useEffect(() => clearError(), [clearError]);

  // No email param means this screen was reached out of order — nothing to
  // verify against, so send them back to the form.
  useEffect(() => {
    if (email.length === 0) {
      router.replace('/sign-up');
    }
  }, [email, router]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => setCooldown(seconds => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = async (value: string) => {
    if (value.length !== CODE_LENGTH || busy) {
      return;
    }
    const ok = await verifyEmailCode({email, code: value});
    if (ok) {
      router.replace('/');
      return;
    }
    // A wrong code: bump the local counter so the "attempts left" line is
    // honest, and clear the field for another go.
    setAttempts(count => count + 1);
    setCode('');
    inputRef.current?.focus();
  };

  const onChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) {
      void submit(digits);
    }
  };

  const resend = async () => {
    if (cooldown > 0) {
      return;
    }
    const sent = await resendCode(email);
    if (sent) {
      setResentAt(Date.now());
      setAttempts(0);
      setCode('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      inputRef.current?.focus();
    }
  };

  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - attempts);
  const boxes = Array.from({length: CODE_LENGTH}, (_, i) => code[i] ?? '');

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />

      <View style={[styles.panel, {paddingTop: insets.top + spacing.lg}]}>
        <BrandMotif
          name="rays"
          color={colors.gold}
          size={150}
          rotation={202}
          opacity={0.9}
          position={styles.rays}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.back}>
          <ArrowLeft
            size={20}
            strokeWidth={icon.strokeWidth}
            color={colors.textOnBrand}
          />
        </Pressable>

        <View style={styles.wordmark}>
          <LogoMark size={26} />
          <Text style={styles.wordmarkText}>Netaville</Text>
        </View>
        <Text style={styles.headline}>Check your{'\n'}email</Text>
        <Text style={styles.sub}>
          We sent a {CODE_LENGTH}-digit code to {email}. Enter it to finish.
        </Text>
      </View>

      <View style={[styles.sheet, {paddingBottom: insets.bottom + spacing.xl}]}>
        <Pressable
          style={styles.boxes}
          onPress={() => inputRef.current?.focus()}
          accessibilityRole="none">
          {boxes.map((digit, i) => (
            <View
              key={i}
              style={[
                styles.box,
                (code.length === i || (code.length === CODE_LENGTH && i === CODE_LENGTH - 1)) &&
                  styles.boxActive,
              ]}>
              <Text style={styles.boxDigit}>{digit}</Text>
            </View>
          ))}
        </Pressable>

        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={onChange}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          autoFocus
          maxLength={CODE_LENGTH}
          style={styles.hiddenInput}
          caretHidden
        />

        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : attempts > 0 ? (
          <Text style={styles.hint}>
            {attemptsLeft > 0
              ? `${attemptsLeft} ${attemptsLeft === 1 ? 'try' : 'tries'} left before the code expires.`
              : 'That code is spent — send a new one.'}
          </Text>
        ) : resentAt !== null ? (
          <Text style={styles.hint}>A new code is on its way.</Text>
        ) : null}

        <PrimaryButton
          label={busy ? 'Checking…' : 'Verify'}
          onPress={() => void submit(code)}
          loading={busy}
          disabled={code.length !== CODE_LENGTH}
          full
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => void resend()}
          disabled={cooldown > 0}
          style={styles.linkRow}>
          <Text style={[styles.linkText, cooldown > 0 && styles.linkTextMuted]}>
            {cooldown > 0
              ? `Resend code in ${cooldown}s`
              : 'Didn’t get it? '}
            {cooldown === 0 ? (
              <Text style={styles.linkStrong}>Resend code</Text>
            ) : null}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/sign-up')}
          style={styles.linkRow}>
          <Text style={styles.linkText}>
            Wrong address? <Text style={styles.linkStrong}>Start over</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.brandBlue},
  panel: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  rays: {top: -40, right: -36},
  back: {
    width: 36,
    height: 36,
    borderRadius: radii.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
    marginBottom: spacing.xs,
  },
  wordmark: {flexDirection: 'row', alignItems: 'center', gap: 9},
  wordmarkText: {
    fontFamily: fonts.extrabold,
    fontSize: 17,
    letterSpacing: -0.5,
    color: colors.textOnBrand,
  },
  headline: {
    fontFamily: fonts.extrabold,
    fontSize: 30,
    lineHeight: 35,
    letterSpacing: -1,
    color: colors.textOnBrand,
    paddingTop: spacing.xs,
  },
  sub: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.74)',
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.lg,
  },
  boxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  box: {
    flex: 1,
    aspectRatio: 0.78,
    borderRadius: radii.cardSm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {borderColor: colors.brandBlue, backgroundColor: colors.blueTintBg},
  boxDigit: {
    fontFamily: fonts.extrabold,
    fontSize: 26,
    color: colors.textInk,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.danger,
    textAlign: 'center',
  },
  hint: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: 'center',
  },
  linkRow: {alignItems: 'center', paddingVertical: spacing.xs},
  linkText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  linkTextMuted: {color: colors.textDim},
  linkStrong: {fontFamily: fonts.bold, color: colors.brandBlue},
});
