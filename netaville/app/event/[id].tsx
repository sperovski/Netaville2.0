import {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ArrowLeft, CalendarDays, Check, Tag} from 'lucide-react-native';
import {ConfirmModal} from '@/components/ConfirmModal';
import {AvatarStack} from '@/components/AvatarStack';
import {GhostButton} from '@/components/GhostButton';
import {IconButton} from '@/components/IconButton';
import {PrimaryButton} from '@/components/PrimaryButton';
import {Screen} from '@/components/Screen';
import {SectionLabel} from '@/components/SectionLabel';
import {StatStrip} from '@/components/StatStrip';
import {useRsvp} from '@/context/rsvp';
import {formatEventDate, formatLongDate} from '@/data/events';
import {colors, fonts, icon, radii, spacing, type as typography} from '@/theme';

const ACTION_BAR_HEIGHT = 88;

function Marker({
  tone,
  label,
  children,
}: {
  tone: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.marker}>
      {children}
      <Text style={[styles.markerText, {color: tone}]}>{label}</Text>
    </View>
  );
}

export default function EventDetailScreen() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {events, isGoing, goingCount, setGoing} = useRsvp();
  // Which confirmation is open, if either.
  const [asking, setAsking] = useState<'going' | 'cancel' | null>(null);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // From the live feed, so the detail and the card behind it never disagree.
  const event =
    id === undefined
      ? undefined
      : events.find(candidate => candidate.id === id);

  if (!event) {
    return (
      <Screen contentStyle={styles.missing}>
        <Text style={typography.sectionTitle}>Event not found</Text>
        <GhostButton label="Go back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const going = isGoing(event.id);
  const attending = goingCount(event.id);

  // Confirmed rather than toggled. Saying yes puts your name in front of the
  // organisers and counts against the room, so a mis-tap on a scrolling list
  // should not be able to do it silently — and taking it back asks too, since
  // that is the half people do by accident on the way past.
  const answer = async (next: boolean) => {
    setAsking(null);
    setSaving(true);
    const result = await setGoing(event.id, next);
    setSaving(false);
    // Only a failure has anything to say; success is visible in the bar.
    setProblem(result.ok ? null : result.message);
  };

  return (
    <View style={styles.root}>
      <Screen scroll bottomInset={ACTION_BAR_HEIGHT + insets.bottom}>
        <View style={styles.header}>
          <IconButton
            accessibilityLabel="Go back"
            onPress={() => router.back()}>
            <ArrowLeft
              size={19}
              strokeWidth={icon.strokeWidth}
              color={colors.brandBlue}
            />
          </IconButton>
        </View>

        <View style={styles.block}>
          <View style={styles.markers}>
            <Marker
              tone={colors.coralText}
              label={`${formatEventDate(event.isoDate)} · ${event.startTime}`}>
              <CalendarDays
                size={13}
                strokeWidth={icon.strokeWidth}
                color={colors.coralText}
              />
            </Marker>
            <Marker tone={colors.cyanText} label={event.category}>
              <Tag
                size={13}
                strokeWidth={icon.strokeWidth}
                color={colors.cyanText}
              />
            </Marker>
          </View>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.when}>
            {formatLongDate(event.isoDate)}
            <Text style={styles.whenTime}>
              {'  '}
              {event.startTime}–{event.endTime}
            </Text>
          </Text>
        </View>

        {/* one card, three facts, hairline dividers — no box-per-value */}
        <View style={styles.block}>
          <StatStrip
            stats={[
              {label: 'Duration', value: event.durationLabel, flex: 0.85},
              {label: 'Room', value: event.room, flex: 1.4},
              {label: 'Going', value: String(attending), flex: 0.75},
            ]}
          />
        </View>

        <View style={styles.block}>
          <SectionLabel>Who&apos;s coming</SectionLabel>
          <View style={styles.attendees}>
            <AvatarStack count={attending} seedKey={event.id} size={34} />
            <Text style={styles.attendeeText}>
              {attending} going · {event.attendeesMaybe} maybe ·{' '}
              {event.openTo.toLowerCase()}
            </Text>
          </View>
        </View>

        <View style={styles.block}>
          <SectionLabel>About</SectionLabel>
          <Text style={[typography.body, styles.description]}>
            {event.description}
          </Text>
        </View>
      </Screen>

      <View
        style={[styles.actionBar, {paddingBottom: insets.bottom + spacing.md}]}>
        {problem === null ? null : (
          <Text style={styles.problem}>{problem}</Text>
        )}
        <View style={styles.actionRow}>
          {going ? (
            <>
              {/* Once you are in, the bar states it rather than offering it
                again — the only thing left to do is change your mind. */}
              <View style={styles.joined}>
                <View style={styles.joinedCheck}>
                  <Check
                    size={13}
                    strokeWidth={2.6}
                    color={colors.textOnBrand}
                  />
                </View>
                <Text style={styles.joinedText}>You&apos;re going</Text>
              </View>
              <GhostButton
                label="Can't make it"
                style={styles.action}
                onPress={() => setAsking('cancel')}
              />
            </>
          ) : (
            <PrimaryButton
              label="I'm going"
              full
              loading={saving}
              style={styles.action}
              onPress={() => setAsking('going')}
            />
          )}
        </View>
      </View>

      <ConfirmModal
        visible={asking === 'going'}
        title="You're going?"
        body={`We'll count you in for “${event.title}” on ${formatLongDate(event.isoDate)} at ${event.startTime}.`}
        confirmLabel="I'm going"
        cancelLabel="Not yet"
        icon={<Check size={20} strokeWidth={2.4} color={colors.brandBlue} />}
        onConfirm={() => void answer(true)}
        onCancel={() => setAsking(null)}
      />

      <ConfirmModal
        visible={asking === 'cancel'}
        title="Can't make it?"
        body={`We'll take you off the list for “${event.title}”.`}
        confirmLabel="Can't make it"
        cancelLabel="Stay going"
        destructive
        onConfirm={() => void answer(false)}
        onCancel={() => setAsking(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  missing: {padding: spacing.xl, gap: spacing.lg, justifyContent: 'center'},
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  block: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  markers: {flexDirection: 'row', alignItems: 'center', gap: spacing.lg},
  marker: {flexDirection: 'row', alignItems: 'center', gap: 6},
  markerText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 30,
    lineHeight: 35,
    letterSpacing: -0.8,
    color: colors.textInk,
  },
  when: {
    fontFamily: fonts.medium,
    fontSize: 14.5,
    color: colors.textMuted,
  },
  whenTime: {
    fontFamily: fonts.bold,
    color: colors.textInk,
  },
  attendees: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  attendeeText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  description: {fontSize: 14.5, lineHeight: 23},
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionRow: {flexDirection: 'row', gap: spacing.md},
  problem: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.danger,
  },
  action: {flex: 1},
  joined: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.blueTintBorder,
    backgroundColor: colors.blueTintBg,
    paddingVertical: 13,
  },
  joinedCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinedText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: -0.1,
    color: colors.brandBlue,
  },
});
