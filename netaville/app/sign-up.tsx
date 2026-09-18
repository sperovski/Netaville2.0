import {useEffect, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useRouter} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ArrowLeft, GraduationCap} from 'lucide-react-native';
import {BrandMotif} from '@/components/BrandMotif';
import {FormField} from '@/components/FormField';
import {LogoMark} from '@/components/LogoMark';
import {PrimaryButton} from '@/components/PrimaryButton';
import {useAuth} from '@/context/auth';
import {isUkimEmail} from '@/lib/ukim';
import {colors, fonts, icon, radii, spacing} from '@/theme';

/**
 * Step one of joining: a name, an email and a password. The server does not
 * create the account here — it mails a six-digit code and the next screen
 * (verify) turns that into a session.
 *
 * A UKIM address earns the student price; the little line under the email field
 * says so live, so it is obvious before submitting whether this is a student
 * account or a member one.
 */
export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {signUpWithEmail, busy, error, clearError} = useAuth();

  // A failure on another auth screen leaves `error` set in the shared context;
  // drop it so this form opens clean.
  useEffect(() => clearError(), [clearError]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const trimmedEmail = email.trim().toLowerCase();
  const isStudentEmail = isUkimEmail(trimmedEmail);

  const submit = async () => {
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    const sent = await signUpWithEmail({
      name: name.trim(),
      email: trimmedEmail,
      password,
    });
    if (sent) {
      router.push({pathname: '/verify', params: {email: trimmedEmail}});
    }
  };

  const shownError = mismatch ? 'Those passwords do not match.' : error;

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
        <Text style={styles.headline}>Create your{'\n'}account</Text>
        <Text style={styles.sub}>
          Use your UKIM email — the one ending in ukim.mk — for the student
          price. Any other email works too.
        </Text>
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[
          styles.sheetContent,
          {paddingBottom: insets.bottom + spacing.xl},
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <FormField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          autoCapitalize="words"
          textContentType="name"
          autoComplete="name"
        />
        <View>
          <FormField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@students.finki.ukim.mk"
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            autoComplete="email"
          />
          {isStudentEmail ? (
            <View style={styles.studentHint}>
              <GraduationCap
                size={14}
                strokeWidth={icon.strokeWidth}
                color={colors.cyanText}
              />
              <Text style={styles.studentHintText}>
                UKIM email — you&apos;ll get the student price.
              </Text>
            </View>
          ) : null}
        </View>
        <FormField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          autoComplete="password-new"
        />
        <FormField
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Type it again"
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          autoComplete="password-new"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />

        {shownError ? <Text style={styles.error}>{shownError}</Text> : null}

        <PrimaryButton
          label={busy ? 'Sending code…' : 'Send verification code'}
          onPress={() => void submit()}
          loading={busy}
          disabled={
            name.trim().length === 0 ||
            email.trim().length === 0 ||
            password.length === 0 ||
            confirm.length === 0
          }
          full
          style={styles.cta}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/log-in')}
          style={styles.linkRow}>
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkStrong}>Log in</Text>
          </Text>
        </Pressable>
      </ScrollView>
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
  },
  sheetContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  studentHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  studentHintText: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: colors.cyanText,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.danger,
    marginTop: -spacing.xs,
  },
  cta: {marginTop: spacing.xs},
  linkRow: {alignItems: 'center', paddingVertical: spacing.xs},
  linkText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  linkStrong: {fontFamily: fonts.bold, color: colors.brandBlue},
});
