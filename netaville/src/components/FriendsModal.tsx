import {useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Check, Gift, UserPlus, X} from 'lucide-react-native';
import {Avatar} from './Avatar';
import {FormField} from './FormField';
import {PrimaryButton} from './PrimaryButton';
import {SectionLabel} from './SectionLabel';
import {useLoyalty} from '@/context/loyalty';
import {colors, fonts, icon, radii, spacing, type as typography} from '@/theme';

/**
 * Friends, from the events screen.
 *
 * A sheet rather than a route: adding someone is a detour from browsing what's
 * on, and it should hand the screen back rather than push a page onto the
 * stack. The full /friends route stays for the deeper trip in from the card.
 */
export function FriendsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
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
  const [name, setName] = useState('');

  const send = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return;
    }
    sendRequest(trimmed);
    setName('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.sheet, {paddingTop: spacing.lg}]}>
        <View style={styles.grabberRow}>
          <View style={styles.grabber} />
        </View>

        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={typography.h1}>Friends</Text>
            <Text style={typography.body}>
              Add people by display name and gift a coffee from your wallet.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
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

        <ScrollView
          contentContainerStyle={[
            styles.body,
            {paddingBottom: insets.bottom + spacing.xxl},
          ]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <FormField
              label="Add by display name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Marble Fox"
            />
            <PrimaryButton
              label="Send friend request"
              full
              onPress={send}
              icon={
                <UserPlus
                  size={16}
                  strokeWidth={icon.strokeWidth}
                  color={colors.textOnBrand}
                />
              }
            />
          </View>

          {requests.length === 0 ? null : (
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
                      <Check
                        size={17}
                        strokeWidth={icon.strokeWidth}
                        color={colors.textOnBrand}
                      />
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
                      <X
                        size={17}
                        strokeWidth={icon.strokeWidth}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <SectionLabel>Your friends</SectionLabel>
            <View style={styles.card}>
              {friends.map((friend, index) => (
                <View
                  key={friend.id}
                  style={[styles.row, index === 0 ? null : styles.divided]}>
                  <Avatar seedKey={friend.id} size={36} />
                  <View style={styles.rowBody}>
                    <Text style={styles.name}>{friend.displayName}</Text>
                    <Text style={styles.meta}>
                      {friend.lifetimeStamps} stamps
                    </Text>
                  </View>
                  <PrimaryButton
                    label="Gift"
                    variant="secondary"
                    size="sm"
                    onPress={() => giftReward(friend.id)}
                    icon={
                      <Gift
                        size={15}
                        strokeWidth={icon.strokeWidth}
                        color={colors.brandBlue}
                      />
                    }
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
                    <X
                      size={17}
                      strokeWidth={icon.strokeWidth}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>
              ))}
              {friends.length === 0 ? (
                <Text style={[typography.body, styles.empty]}>
                  No friends added yet.
                </Text>
              ) : null}
            </View>
          </View>

          <Text style={styles.note}>
            {rewards === 0
              ? 'Your wallet is empty. Collect 10 stamps to gift a coffee.'
              : `${rewards} free ${rewards === 1 ? 'coffee' : 'coffees'} in your wallet. Gifting cannot be undone.`}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {flex: 1, backgroundColor: colors.bg},
  grabberRow: {alignItems: 'center', paddingBottom: spacing.md},
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headText: {flex: 1, gap: spacing.xs},
  close: {
    width: 38,
    height: 38,
    borderRadius: radii.iconButton,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {gap: spacing.xl, paddingTop: spacing.xs},
  section: {paddingHorizontal: spacing.xl, gap: spacing.md},
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
  rowBody: {flex: 1, gap: 1},
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
    paddingHorizontal: spacing.xl,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  pressed: {opacity: 0.72},
});
