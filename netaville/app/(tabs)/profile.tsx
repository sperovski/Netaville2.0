import {useState} from 'react';
import {Pressable, StyleSheet, Switch, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {
  Bell,
  FileText,
  GraduationCap,
  Info,
  LockKeyhole,
  LogOut,
  Trophy,
  Users,
} from 'lucide-react-native';
import {AvatarRing} from '@/components/AvatarRing';
import {ListRow} from '@/components/ListRow';
import {Screen} from '@/components/Screen';
import {SectionLabel} from '@/components/SectionLabel';
import {StatStrip} from '@/components/StatStrip';
import {useLoyalty} from '@/context/loyalty';
import {nextTierFor, tierFor} from '@/data/loyalty';
import {colors, fonts, icon, radii, spacing, type as typography} from '@/theme';

const languages = ['EN', 'МК', 'SQ'] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const {
    lifetimeStamps,
    coffeesRedeemed,
    rank,
    friends,
    notifications,
    isStudent,
    setStudent,
  } = useLoyalty();
  const tier = tierFor(lifetimeStamps);
  const nextTier = nextTierFor(lifetimeStamps);
  const tierProgress =
    nextTier === null
      ? 1
      : (lifetimeStamps - tier.threshold) / (nextTier.threshold - tier.threshold);

  const [language, setLanguage] = useState<string>(languages[0]);
  const [onLeaderboard, setOnLeaderboard] = useState(true);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <AvatarRing seedKey="stefan" tier={tier} progress={tierProgress} size={96} />
        <Text style={[typography.h1, styles.name]}>Stefan P.</Text>
        <Text style={typography.body}>Member since 2024</Text>
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
            {label: 'Rank', value: `#${rank}`, tint: colors.cyan},
          ]}
        />
      </View>

      <View style={styles.section}>
        <SectionLabel tone={colors.brandBlue}>Account</SectionLabel>
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
        <SectionLabel tone={colors.cyan}>Student discount</SectionLabel>
        <View style={styles.toggleRow}>
          <GraduationCap size={20} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />
          <View style={styles.toggleBody}>
            <Text style={styles.toggleLabel}>Verified student</Text>
            <Text style={styles.toggleHint}>Unlocks student prices on the menu</Text>
          </View>
          <Switch
            value={isStudent}
            onValueChange={setStudent}
            trackColor={{false: colors.divider, true: colors.brandBlue}}
            thumbColor={colors.surface}
            ios_backgroundColor={colors.divider}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionLabel tone={colors.gold}>Language</SectionLabel>
        <View style={styles.languages}>
          {languages.map(candidate => {
            const active = candidate === language;
            return (
              <Pressable
                key={candidate}
                accessibilityRole="button"
                onPress={() => setLanguage(candidate)}
                style={({pressed}) => [
                  styles.language,
                  active ? styles.languageActive : null,
                  pressed ? styles.pressed : null,
                ]}>
                <Text style={[styles.languageText, active ? styles.languageTextActive : null]}>
                  {candidate}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.toggleRow}>
          <Trophy size={20} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />
          <Text style={styles.toggleLabel}>Show me on leaderboard</Text>
          <Switch
            value={onLeaderboard}
            onValueChange={setOnLeaderboard}
            trackColor={{false: colors.divider, true: colors.brandBlue}}
            thumbColor={colors.surface}
            ios_backgroundColor={colors.divider}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionLabel tone={colors.coral}>App &amp; legal</SectionLabel>
        <ListRow
          icon={<Info size={20} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />}
          label="About Netaville"
          onPress={() => router.push('/about')}
        />
        <ListRow
          icon={<LockKeyhole size={20} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />}
          label="Privacy & data"
        />
        <ListRow
          icon={<FileText size={20} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />}
          label="Terms"
        />
      </View>

      <View style={styles.section}>
        <Pressable
          accessibilityRole="button"
          style={({pressed}) => [styles.signOut, pressed ? styles.pressed : null]}>
          <LogOut size={19} strokeWidth={icon.strokeWidth} color={colors.danger} />
          <Text style={styles.signOutText}>Sign out</Text>
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
  languages: {flexDirection: 'row', gap: spacing.sm},
  language: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.chip,
    backgroundColor: colors.blueTintBg,
    borderWidth: 1,
    borderColor: colors.blueTintBorder,
  },
  languageActive: {
    backgroundColor: colors.brandBlue,
    borderColor: colors.brandBlue,
  },
  languageText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.brandBlue,
  },
  languageTextActive: {color: colors.textOnBrand},
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
  pressed: {opacity: 0.75},
});
