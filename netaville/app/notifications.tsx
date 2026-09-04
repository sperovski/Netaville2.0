import {StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {ArrowLeft, BellRing} from 'lucide-react-native';
import {GhostButton} from '@/components/GhostButton';
import {IconButton} from '@/components/IconButton';
import {Screen} from '@/components/Screen';
import {useLoyalty} from '@/context/loyalty';
import {colors, fonts, icon, radii, spacing, type as typography} from '@/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const {notifications, clearNotifications} = useLoyalty();

  return (
    <Screen scroll>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Go back" onPress={() => router.back()}>
          <ArrowLeft size={19} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />
        </IconButton>
      </View>

      <View style={styles.intro}>
        <Text style={typography.display}>Notifications</Text>
      </View>

      <View style={styles.section}>
        {notifications.length === 0 ? (
          <Text style={typography.body}>You&apos;re all caught up — no notifications yet.</Text>
        ) : (
          <>
            {notifications.map(notification => (
              <View key={notification.id} style={styles.card}>
                <BellRing size={20} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />
                <View style={styles.body}>
                  <Text style={styles.title}>{notification.title}</Text>
                  <Text style={styles.text}>{notification.body}</Text>
                </View>
              </View>
            ))}
            <GhostButton label="Clear all" onPress={clearNotifications} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg},
  intro: {paddingHorizontal: spacing.xl, paddingBottom: spacing.xl},
  section: {paddingHorizontal: spacing.xl, gap: spacing.md},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.cardSm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  body: {flex: 1, gap: 2},
  title: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: colors.textInk,
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
});
