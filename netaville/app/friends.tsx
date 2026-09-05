import {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {ArrowLeft, Check, Gift, X} from 'lucide-react-native';
import {Avatar} from '@/components/Avatar';
import {GhostButton} from '@/components/GhostButton';
import {IconButton} from '@/components/IconButton';
import {FormField} from '@/components/FormField';
import {PrimaryButton} from '@/components/PrimaryButton';
import {Screen} from '@/components/Screen';
import {SectionLabel} from '@/components/SectionLabel';
import {useLoyalty} from '@/context/loyalty';
import {colors, fonts, icon, radii, spacing, type as typography} from '@/theme';

export default function FriendsScreen() {
  const router = useRouter();
  const {
    friends,
    requests,
    rewards,
    giftReward,
    acceptRequest,
    declineRequest,
    removeFriend,
    sendRequest,
  } = useLoyalty();
  const [username, setUsername] = useState('');

  return (
    <Screen scroll>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Go back" onPress={() => router.back()}>
          <ArrowLeft size={19} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />
        </IconButton>
      </View>

      <View style={styles.intro}>
        <Text style={typography.display}>Friends</Text>
        <Text style={typography.body}>
          Add people by display name and gift a free coffee from your wallet.
        </Text>
      </View>

      <View style={styles.section}>
        <FormField
          label="Add by display name"
          value={username}
          onChangeText={setUsername}
          placeholder="e.g. Marble Fox"
        />
        <PrimaryButton
          label="Send friend request"
          onPress={() => {
            sendRequest(username);
            setUsername('');
          }}
        />
      </View>

      {requests.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel>Requests</SectionLabel>
          <View style={styles.card}>
            {requests.map((request, index) => (
              <View
                key={request.id}
                style={[styles.row, index === 0 ? null : styles.divided]}>
                <Avatar seedKey={request.id} size={36} />
                <Text style={styles.name}>{request.displayName}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Accept ${request.displayName}`}
                  onPress={() => acceptRequest(request.id)}
                  style={({pressed}) => [
                    styles.action,
                    styles.accept,
                    pressed ? styles.pressed : null,
                  ]}>
                  <Check size={17} strokeWidth={icon.strokeWidth} color={colors.textOnBrand} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Decline ${request.displayName}`}
                  onPress={() => declineRequest(request.id)}
                  style={({pressed}) => [
                    styles.action,
                    styles.decline,
                    pressed ? styles.pressed : null,
                  ]}>
                  <X size={17} strokeWidth={icon.strokeWidth} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionLabel>Your friends</SectionLabel>
        <View style={styles.card}>
          {friends.map((friend, index) => (
            <View key={friend.id} style={[styles.row, index === 0 ? null : styles.divided]}>
              <Avatar seedKey={friend.id} size={36} />
              <View style={styles.body}>
                <Text style={styles.name}>{friend.displayName}</Text>
                <Text style={styles.meta}>{friend.lifetimeStamps} stamps</Text>
              </View>
              <GhostButton
                label="Gift"
                size="sm"
                onPress={() => giftReward(friend.id)}
                icon={<Gift size={15} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${friend.displayName}`}
                onPress={() => removeFriend(friend.id)}
                style={({pressed}) => [
                  styles.action,
                  styles.decline,
                  pressed ? styles.pressed : null,
                ]}>
                <X size={17} strokeWidth={icon.strokeWidth} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
          {friends.length === 0 ? (
            <Text style={[typography.body, styles.empty]}>No friends added yet.</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.note}>
          {rewards === 0
            ? 'Your wallet is empty. Collect 10 stamps to gift a coffee.'
            : `${rewards} free ${rewards === 1 ? 'coffee' : 'coffees'} in your wallet. Gifting cannot be undone.`}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg},
  intro: {paddingHorizontal: spacing.xl, gap: spacing.xs, paddingBottom: spacing.xl},
  section: {paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.xl},
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divided: {borderTopWidth: 1, borderTopColor: colors.divider},
  body: {flex: 1, gap: 1},
  name: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.textInk,
  },
  meta: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.textDim,
  },
  action: {
    width: 34,
    height: 34,
    borderRadius: radii.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accept: {backgroundColor: colors.brandBlue},
  decline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  empty: {paddingVertical: spacing.lg},
  note: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  pressed: {opacity: 0.75},
});
