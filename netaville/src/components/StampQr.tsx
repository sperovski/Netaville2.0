import {useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {useAuth} from '@/context/auth';
import {STAMP_CODE_TTL_MS, makeStampCode} from '@/lib/stampCode';
import {colors, fonts, radii, spacing} from '@/theme';

/**
 * The card's QR code: what staff scan to add a stamp.
 *
 * It rotates on its own so the thing on screen is always current — the student
 * never has to think about refreshing it, and a screenshot sent to a friend is
 * stale before they reach the counter.
 */
export function StampQr({size = 168}: {size?: number}) {
  const {user} = useAuth();
  const [now, setNow] = useState(() => Date.now());

  const code = useMemo(
    () => (user === null ? null : makeStampCode(user, now)),
    [user, now],
  );

  useEffect(() => {
    if (code === null) {
      return;
    }
    // Wake exactly when this code dies rather than polling every second: the
    // card is a screen people leave open at a counter.
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.max(500, code.expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [code]);

  if (user === null || code === null) {
    return null;
  }

  const secondsLeft = Math.max(0, Math.ceil((code.expiresAt - now) / 1000));

  return (
    <View style={styles.wrap}>
      <View style={[styles.frame, {width: size + 28, height: size + 28}]}>
        <QRCode
          value={code.value}
          size={size}
          color={colors.textInk}
          backgroundColor={colors.surface}
        />
      </View>
      <Text style={styles.hint}>Show this at the counter</Text>
      <Text style={styles.meta}>
        Refreshes in {secondsLeft}s · {Math.round(STAMP_CODE_TTL_MS / 1000)}s
        codes
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {alignItems: 'center', gap: spacing.sm},
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  hint: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.textInk,
    marginTop: spacing.xs,
  },
  meta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textDim,
  },
});
