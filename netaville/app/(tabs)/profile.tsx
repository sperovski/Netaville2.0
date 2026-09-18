import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {
  Bell,
  Check,
  FileText,
  GraduationCap,
  Info,
  LockKeyhole,
  LogOut,
  Pencil,
  Smartphone,
  Users,
} from 'lucide-react-native';
import {AvatarRing} from '@/components/AvatarRing';
import {ListRow} from '@/components/ListRow';
import {Screen} from '@/components/Screen';
import {SectionLabel} from '@/components/SectionLabel';
import {StatStrip} from '@/components/StatStrip';
import {useAuth} from '@/context/auth';
import {useLoyalty} from '@/context/loyalty';
import {nextTierFor, tierFor} from '@/data/loyalty';
import {colors, fonts, icon, radii, spacing, type as typography} from '@/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const {user, avatarSeed, signOut, signOutEverywhere} = useAuth();
  const {
    lifetimeStamps,
    coffeesRedeemed,
    rank,
    friends,
    notifications,
    isStudent,
  } = useLoyalty();
  const tier = tierFor(lifetimeStamps);
  const nextTier = nextTierFor(lifetimeStamps);
  const tierProgress =
    nextTier === null
      ? 1
      : (lifetimeStamps - tier.threshold) / (nextTier.threshold - tier.threshold);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change your avatar"
          onPress={() => router.push('/avatar')}
          style={({pressed}) => (pressed ? styles.pressed : null)}>
          <AvatarRing
            seedKey={user?.id ?? 'stefan'}
            tier={tier}
            progress={tierProgress}
            size={96}
            seed={avatarSeed}
          />
          <View style={styles.editBadge}>
            <Pencil size={12} strokeWidth={2.4} color={colors.textOnBrand} />
          </View>
        </Pressable>
        <Text style={[typography.h1, styles.name]}>{user?.name ?? 'Your account'}</Text>
        <Text style={typography.body}>{user?.email ?? 'Member since 2024'}</Text>
        <View style={styles.tierLine}>
          <Text style={[styles.tierName, {color: tier.color}]}>{tier.name}</Text>
          <View style={styles.tierDot} />
          <Text style={styles.tierProgress}>
            {nextTier === null
              ? 'Top tier'
              : `${nextTier.threshold - lifetimeStamps} stamps to ${nextTier.name}`}
          </Text>
        </View>
      </View>

      <View style={styles.stats}>
        <StatStrip
          stats={[
            {label: 'Stamps', value: String(lifetimeStamps), tint: colors.brandBlue},
            {label: 'Redeemed', value: String(coffeesRedeemed), tint: colors.coral},
            {label: 'Rank', value: rank === null ? '—' : `#${rank}`, tint: colors.cyan},
          ]}
        />
      </View>

      <View style={styles.section}>
        <SectionLabel>Account</SectionLabel>
        <ListRow
          icon={<Users size={20} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />}
          label="Friends"
          value={`${friends.length} connected`}
          onPress={() => router.push('/friends')}
        />
        <ListRow
          icon={<Bell size={20} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />}
          label="Notifications"
          value={
            notifications.length === 0
              ? 'All caught up'
              : `${notifications.length} new`
          }
          onPress={() => router.push('/notifications')}
        />
      </View>

      <View style={styles.section}>
        <SectionLabel>Student discount</SectionLabel>
        <View style={styles.toggleRow}>
          <GraduationCap size={20} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />
          <View style={styles.toggleBody}>
            <Text style={styles.toggleLabel}>
              {isStudent ? 'Verified student' : 'Not a student account'}
            </Text>
            <Text style={styles.toggleHint}>
              {isStudent
                ? 'Student prices show on the menu automatically.'
                : 'Sign up with a UKIM email to unlock student prices.'}
            </Text>
          </View>
          {isStudent ? (
            <View style={styles.verifiedBadge}>
              <Check size={15} strokeWidth={2.4} color={colors.textOnBrand} />
            </View>
          ) : null}
        </View>
      </View>

      {/* The language picker and the "show me on leaderboard" switch used to
          sit here. Both only moved local state and changed nothing, which is a
          worse thing to ship than their absence. They come back when there is
          translation to switch to and a column to store the preference in. */}

      <View style={styles.section}>
        <SectionLabel>App &amp; legal</SectionLabel>
        <ListRow
          icon={<Info size={20} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />}
          label="About Netaville"
          onPress={() => router.push('/about')}
        />
        <ListRow
          icon={<LockKeyhole size={20} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />}
          label="Privacy & data"
          onPress={() => router.push('/legal?doc=privacy')}
        />
        <ListRow
          icon={<FileText size={20} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />}
          label="Terms"
          onPress={() => router.push('/legal?doc=terms')}
        />
      </View>

      <View style={styles.section}>
        <Pressable
          accessibilityRole="button"
          onPress={() => void signOut()}
          style={({pressed}) => [styles.signOut, pressed ? styles.pressed : null]}>
          <LogOut size={19} strokeWidth={icon.strokeWidth} color={colors.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
        {/* What to reach for when a phone goes missing: it revokes every
            refresh token on the account, not just this device's. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => void signOutEverywhere()}
          style={({pressed}) => [styles.signOut, pressed ? styles.pressed : null]}>
          <Smartphone size={19} strokeWidth={icon.strokeWidth} color={colors.textMuted} />
          <Text style={styles.signOutAllText}>Sign out on all devices</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  name: {marginTop: spacing.md},
  editBadge: {
    position: 'absolute',
    left: 6,
    bottom: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  tierLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tierName: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  tierDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textDim,
  },
  tierProgress: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  stats: {paddingHorizontal: spacing.xl, paddingBottom: spacing.xl},
  section: {paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.xl},
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.cardSm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  toggleBody: {flex: 1, gap: 2},
  toggleLabel: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.textInk,
  },
  toggleHint: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  verifiedBadge: {
    width: 24,
    height: 24,
    borderRadius: radii.iconButton,
    backgroundColor: colors.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  signOutText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.danger,
  },
  signOutAllText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.textMuted,
  },
  pressed: {opacity: 0.75},
});
