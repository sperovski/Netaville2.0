import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {Check, X} from 'lucide-react-native';
import {Avatar} from '@/components/Avatar';
import {Screen} from '@/components/Screen';
import {useAuth} from '@/context/auth';
import {avatarSeeds, seedFor, type AvatarSeed} from '@/data/avatars';
import {colors, icon, radii, spacing, type as typography} from '@/theme';

/** Pick the doodle face that represents you. */
export default function AvatarScreen() {
  const router = useRouter();
  const {user, avatarSeed, chooseAvatar} = useAuth();

  // With nothing picked yet the profile shows the face derived from the
  // account id — mark that one so the grid always has a current selection.
  const current: AvatarSeed = avatarSeed ?? seedFor(user?.id ?? 'stefan');

  const pick = (seed: AvatarSeed) => {
    void chooseAvatar(seed);
    router.back();
  };

  return (
    <Screen scroll edgeTop={false}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={typography.h1}>Choose your face</Text>
          <Text style={typography.body}>
            It shows up on your card, on friends&apos; lists and the
            leaderboard.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => router.back()}
          style={({pressed}) => [
            styles.close,
            pressed ? styles.pressed : null,
          ]}>
          <X
            size={19}
            strokeWidth={icon.strokeWidth}
            color={colors.textMuted}
          />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {avatarSeeds.map(seed => {
          const active = seed === current;
          return (
            <Pressable
              key={seed}
              accessibilityRole="button"
              accessibilityLabel={`Avatar ${seed}`}
              accessibilityState={{selected: active}}
              onPress={() => pick(seed)}
              style={({pressed}) => [
                styles.tile,
                active ? styles.tileActive : null,
                pressed ? styles.pressed : null,
              ]}>
              <Avatar seedKey={seed} seed={seed} size={72} />
              {active ? (
                <View style={styles.check}>
                  <Check
                    size={13}
                    strokeWidth={2.6}
                    color={colors.textOnBrand}
                  />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  headerText: {flex: 1, gap: spacing.xs},
  close: {
    width: 34,
    height: 34,
    borderRadius: radii.iconButton,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  tile: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileActive: {
    borderColor: colors.brandBlue,
    borderWidth: 2,
    backgroundColor: colors.blueTintBg,
  },
  check: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  pressed: {opacity: 0.8},
});
