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
import {ArrowLeft} from 'lucide-react-native';
import {BrandMotif} from '@/components/BrandMotif';
import {FormField} from '@/components/FormField';
import {LogoMark} from '@/components/LogoMark';
import {PrimaryButton} from '@/components/PrimaryButton';
import {useAuth} from '@/context/auth';
import {colors, fonts, icon, radii, spacing} from '@/theme';

/**
 * Coming back in with an email and password. Everyone signs in this way now —
 * student or member, the door is the same.
 */
export default function LogInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {signInWithEmail, busy, error, clearError} = useAuth();

  // Clear any error carried over from the sign-up screen.
  useEffect(() => clearError(), [clearError]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    const ok = await signInWithEmail({email: email.trim(), password});
    if (ok) {
      router.replace('/');
    }
  };

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
        <Text style={styles.headline}>Welcome{'\n'}back</Text>
        <Text style={styles.sub}>Log in with your email and password.</Text>
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
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
          autoComplete="email"
        />
        <FormField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
          autoComplete="password"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          label={busy ? 'Logging in…' : 'Log in'}
          onPress={() => void submit()}
          loading={busy}
          disabled={email.trim().length === 0 || password.length === 0}
          full
          style={styles.cta}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/sign-up')}
          style={styles.linkRow}>
          <Text style={styles.linkText}>
            New here? <Text style={styles.linkStrong}>Create an account</Text>
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
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.danger,
    marginTop: -spacing.xs,
  },
  cta: {marginTop: spacing.xs},
  linkRow: {alignItems: 'center', paddingVertical: spacing.xs},
  linkText: {fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted},
  linkStrong: {fontFamily: fonts.bold, color: colors.brandBlue},
});
