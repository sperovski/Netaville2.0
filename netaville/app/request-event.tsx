import {useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Check, Clock, Minus, Plus, Trash2, X} from 'lucide-react-native';
import {AppIcon} from '@/components/AppIcon';
import {FieldRow, FormField, SelectField} from '@/components/FormField';
import {GhostButton} from '@/components/GhostButton';
import {PrimaryButton} from '@/components/PrimaryButton';
import {Screen} from '@/components/Screen';
import {SectionLabel} from '@/components/SectionLabel';
import {useAuth} from '@/context/auth';
import {useRsvp} from '@/context/rsvp';
import {DIETARY_OPTIONS, submitEventRequest, type Dietary} from '@/lib/api';
import {parseDate, parseTime} from '@/lib/parseWhen';
import {colors, fonts, icon, radii, spacing, type as typography} from '@/theme';

const rooms = [
  'Amphitheatre',
  'Classroom',
  'Cafeteria',
  'Co-working floor',
] as const;
const cateringOptions = ['None', 'Coffee & snacks', 'Full catering'] as const;
const categories = ['Workshop', 'Social', 'Talk', 'Quiz', 'Community'] as const;
const ACTION_BAR_HEIGHT = 88;

/**
 * How many alternatives an organiser may offer.
 *
 * The room is nearly always what decides, so proposing a couple of workable
 * slots up front turns a rejection-and-resubmit into one decision. Past four
 * it stops being a request and becomes a scheduling problem.
 */
const MAX_SLOTS = 4;

/** One row of the date list, as typed. Parsed only on submit. */
type SlotDraft = {key: string; date: string; time: string};

let slotKey = 0;
function emptySlot(): SlotDraft {
  slotKey += 1;
  return {key: `slot-${slotKey}`, date: '', time: ''};
}

export default function RequestEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Community');
  const [slots, setSlots] = useState<SlotDraft[]>([emptySlot()]);
  const [room, setRoom] = useState<string>(rooms[0]);
  const [catering, setCatering] = useState<string>(cateringOptions[0]);
  const [dietary, setDietary] = useState<Dietary[]>([]);
  const [foodNotes, setFoodNotes] = useState('');
  const [participants, setParticipants] = useState(20);
  const [sending, setSending] = useState(false);
  const {user} = useAuth();
  const {refresh} = useRsvp();

  const submit = async () => {
    if (user === null || sending) {
      return;
    }
    if (title.trim().length === 0) {
      Alert.alert('Add a title', 'Tell us what the event is called.');
      return;
    }
    // Every filled row must parse; a blank trailing row is just an unused
    // option and is dropped rather than being an error.
    const filled = slots.filter(
      slot => slot.date.trim().length > 0 || slot.time.trim().length > 0,
    );
    if (filled.length === 0) {
      Alert.alert(
        'Add a date',
        'Tell us at least one date and time that would work.',
      );
      return;
    }

    const dates = [];
    for (const [index, slot] of filled.entries()) {
      const isoDate = parseDate(slot.date);
      if (isoDate === null) {
        Alert.alert(
          `Check date ${index + 1}`,
          'Try a date like “12 Sep” or “2026-09-12”.',
        );
        return;
      }
      const times = parseTime(slot.time);
      if (times === null) {
        Alert.alert(
          `Check time ${index + 1}`,
          'Try a start time like “18:00”, or a range like “18:00-20:00”.',
        );
        return;
      }
      dates.push({
        date: isoDate,
        startTime: times.startTime,
        endTime: times.endTime,
      });
    }

    setSending(true);
    try {
      await submitEventRequest(user, {
        title: title.trim(),
        description: description.trim(),
        category,
        dates,
        room,
        catering,
        dietary,
        foodNotes: foodNotes.trim(),
        expectedParticipants: participants,
      });
      // An approval publishes the event straight away, so pull the feed again
      // on the way out rather than leaving a stale list behind.
      void refresh();
      Alert.alert(
        'Request sent',
        dates.length === 1
          ? 'We\u2019ll review it and get back to you.'
          : `We\u2019ll pick one of your ${dates.length} dates and get back to you.`,
        [{text: 'OK', onPress: () => router.back()}],
      );
    } catch (caught) {
      Alert.alert(
        'Could not send it',
        caught instanceof Error ? caught.message : 'Try again in a moment.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll bottomInset={ACTION_BAR_HEIGHT + insets.bottom}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={typography.h1}>Request an event</Text>
            <Text style={typography.body}>
              We&apos;ll review it and get back to you.
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

        <View style={styles.form}>
          <FormField
            label="Event title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. React Native meetup"
          />

          <FormField
            label="What is it? (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="A sentence students will read on the event card."
            multiline
          />

          <SelectField
            label="Event type"
            value={category}
            options={categories}
            onChange={setCategory}
          />

          {/* Several slots, best first. The panel shows them in this order and
              picks one — offering alternatives is what avoids a second round
              trip when the room is already taken. */}
          <View style={styles.slots}>
            <SectionLabel>
              {slots.length === 1
                ? 'When could it run?'
                : `When could it run? (${slots.length} options)`}
            </SectionLabel>
            {slots.map((slot, index) => (
              <View key={slot.key} style={styles.slotRow}>
                <FieldRow>
                  <FormField
                    label={index === 0 ? 'Preferred date' : `Date ${index + 1}`}
                    value={slot.date}
                    onChangeText={value =>
                      setSlots(current =>
                        current.map(candidate =>
                          candidate.key === slot.key
                            ? {...candidate, date: value}
                            : candidate,
                        ),
                      )
                    }
                    placeholder="12 Sep"
                    style={styles.flex}
                    leadingIcon={
                      <AppIcon
                        name="calendar"
                        color={colors.brandBlue}
                        size={icon.size}
                      />
                    }
                  />
                  <FormField
                    label="Time"
                    value={slot.time}
                    onChangeText={value =>
                      setSlots(current =>
                        current.map(candidate =>
                          candidate.key === slot.key
                            ? {...candidate, time: value}
                            : candidate,
                        ),
                      )
                    }
                    placeholder="18:00-20:00"
                    style={styles.flex}
                    leadingIcon={
                      <Clock
                        size={icon.size}
                        strokeWidth={icon.strokeWidth}
                        color={colors.brandBlue}
                      />
                    }
                  />
                </FieldRow>
                {slots.length === 1 ? null : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove option ${index + 1}`}
                    onPress={() =>
                      setSlots(current =>
                        current.filter(candidate => candidate.key !== slot.key),
                      )
                    }
                    style={({pressed}) => [
                      styles.slotRemove,
                      pressed ? styles.pressed : null,
                    ]}>
                    <Trash2
                      size={16}
                      strokeWidth={icon.strokeWidth}
                      color={colors.textDim}
                    />
                  </Pressable>
                )}
              </View>
            ))}

            {slots.length >= MAX_SLOTS ? (
              <Text style={styles.slotHint}>
                That is as many alternatives as we can take.
              </Text>
            ) : (
              <GhostButton
                label="Add another date that would work"
                size="sm"
                onPress={() => setSlots(current => [...current, emptySlot()])}
                icon={
                  <Plus
                    size={15}
                    strokeWidth={icon.strokeWidth}
                    color={colors.brandBlue}
                  />
                }
              />
            )}
          </View>

          <SelectField
            label="Room"
            value={room}
            options={rooms}
            onChange={setRoom}
          />
          <SelectField
            label="Catering"
            value={catering}
            options={cateringOptions}
            onChange={setCatering}
          />

          {/* Only worth asking once there is food to have a preference about. */}
          {catering === 'None' ? null : (
            <View style={styles.dietary}>
              <SectionLabel>Dietary requirements</SectionLabel>
              <View style={styles.dietaryRow}>
                {DIETARY_OPTIONS.map(option => {
                  const on = dietary.includes(option);
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="checkbox"
                      accessibilityState={{checked: on}}
                      onPress={() =>
                        setDietary(current =>
                          on
                            ? current.filter(item => item !== option)
                            : [...current, option],
                        )
                      }
                      style={({pressed}) => [
                        styles.diet,
                        on ? styles.dietOn : null,
                        pressed ? styles.pressed : null,
                      ]}>
                      {on ? (
                        <Check
                          size={13}
                          strokeWidth={2.6}
                          color={colors.textOnBrand}
                        />
                      ) : null}
                      <Text
                        style={[
                          styles.dietText,
                          on ? styles.dietTextOn : null,
                        ]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <FormField
                label="Anything else the kitchen should know"
                value={foodNotes}
                onChangeText={setFoodNotes}
                placeholder="e.g. one severe nut allergy"
                multiline
              />
            </View>
          )}

          <View style={styles.stepperGroup}>
            <SectionLabel>Expected participants</SectionLabel>
            <View style={styles.stepper}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fewer participants"
                onPress={() =>
                  setParticipants(current => Math.max(1, current - 5))
                }
                style={({pressed}) => [
                  styles.stepButton,
                  styles.stepGhost,
                  pressed ? styles.pressed : null,
                ]}>
                <Minus
                  size={18}
                  strokeWidth={icon.strokeWidth}
                  color={colors.brandBlue}
                />
              </Pressable>
              <Text style={styles.stepValue}>{participants}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="More participants"
                onPress={() => setParticipants(current => current + 5)}
                style={({pressed}) => [
                  styles.stepButton,
                  styles.stepFilled,
                  pressed ? styles.pressed : null,
                ]}>
                <Plus
                  size={18}
                  strokeWidth={icon.strokeWidth}
                  color={colors.textOnBrand}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </Screen>

      <View
        style={[styles.actionBar, {paddingBottom: insets.bottom + spacing.md}]}>
        <PrimaryButton
          label={sending ? 'Sending…' : 'Send event request'}
          disabled={sending}
          onPress={() => void submit()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  slots: {gap: spacing.md},
  slotRow: {flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm},
  slotRemove: {
    width: 38,
    height: 38,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  slotHint: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.textDim,
  },
  dietary: {gap: spacing.md},
  dietaryRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  diet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.blueTintBorder,
    backgroundColor: colors.surface,
  },
  dietOn: {backgroundColor: colors.brandBlue, borderColor: colors.brandBlue},
  dietText: {
    fontFamily: fonts.semibold,
    fontSize: 12.5,
    color: colors.brandBlue,
  },
  dietTextOn: {color: colors.textOnBrand},
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  headerText: {flex: 1, gap: spacing.xs},
  close: {
    width: 34,
    height: 34,
    borderRadius: radii.iconButton,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {paddingHorizontal: spacing.xl, gap: spacing.xl},
  flex: {flex: 1},
  stepperGroup: {gap: spacing.sm},
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGhost: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.blueTintBorder,
  },
  stepFilled: {backgroundColor: colors.brandBlue},
  stepValue: {
    fontFamily: fonts.extrabold,
    fontSize: 20,
    letterSpacing: -0.4,
    color: colors.textInk,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pressed: {opacity: 0.75},
});
