import {StyleSheet, Text, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ArrowLeft, Coffee, CupSoda} from 'lucide-react-native';
import {AvatarStack} from '@/components/AvatarStack';
import {GhostButton} from '@/components/GhostButton';
import {IconButton} from '@/components/IconButton';
import {PrimaryButton} from '@/components/PrimaryButton';
import {Screen} from '@/components/Screen';
import {SectionLabel} from '@/components/SectionLabel';
import {StatStrip} from '@/components/StatStrip';
import {useRsvp} from '@/context/rsvp';
import {formatEventDate, formatLongDate, getEventById} from '@/data/events';
import {colors, fonts, icon, spacing, type as typography} from '@/theme';

const ACTION_BAR_HEIGHT = 88;

function Marker({tone, label}: {tone: string; label: string}) {
  return (
    <View style={styles.marker}>
      <View style={[styles.markerDot, {backgroundColor: tone}]} />
      <Text style={[styles.markerText, {color: tone}]}>{label}</Text>
    </View>
  );
}

function Perk({tone, label, children}: {tone: string; label: string; children: React.ReactNode}) {
  return (
    <View style={styles.perk}>
      {children}
      <Text style={[styles.perkText, {color: tone}]}>{label}</Text>
    </View>
  );
}

export default function EventDetailScreen() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {isGoing, goingCount, toggleRsvp} = useRsvp();

  const event = id === undefined ? undefined : getEventById(id);

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

  return (
    <View style={styles.root}>
      <Screen scroll bottomInset={ACTION_BAR_HEIGHT + insets.bottom}>
        <View style={styles.header}>
          <IconButton accessibilityLabel="Go back" onPress={() => router.back()}>
            <ArrowLeft size={19} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />
          </IconButton>
        </View>

        <View style={styles.block}>
          <View style={styles.markers}>
            <Marker
              tone={colors.coralText}
              label={`${formatEventDate(event.isoDate)} · ${event.startTime}`}
            />
            <Marker tone={colors.cyanText} label={event.category} />
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
              {attending} going · {event.attendeesMaybe} maybe · {event.openTo.toLowerCase()}
            </Text>
          </View>
        </View>

        <View style={styles.block}>
          <SectionLabel>About</SectionLabel>
          <Text style={[typography.body, styles.description]}>{event.description}</Text>
        </View>

        {event.catering || event.drinks ? (
          <View style={styles.block}>
            <SectionLabel>What&apos;s included</SectionLabel>
            <View style={styles.perks}>
              {event.catering ? (
                <Perk tone={colors.coralText} label="Catering included">
                  <Coffee size={15} strokeWidth={icon.strokeWidth} color={colors.coralText} />
                </Perk>
              ) : null}
              {event.drinks ? (
                <Perk tone={colors.cyanText} label="Drinks from the cafeteria">
                  <CupSoda size={15} strokeWidth={icon.strokeWidth} color={colors.cyanText} />
                </Perk>
              ) : null}
            </View>
          </View>
        ) : null}
      </Screen>

      <View style={[styles.actionBar, {paddingBottom: insets.bottom + spacing.md}]}>
        <GhostButton
          label="Can't make it"
          style={styles.action}
          onPress={() => {
            if (going) {
              toggleRsvp(event.id);
            }
          }}
        />
        <PrimaryButton
          label={going ? 'Going' : "I'm going"}
          style={styles.action}
          onPress={() => {
            if (!going) {
              toggleRsvp(event.id);
            }
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  missing: {padding: spacing.xl, gap: spacing.lg, justifyContent: 'center'},
  header: {paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg},
  block: {paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.xl},
  markers: {flexDirection: 'row', alignItems: 'center', gap: spacing.lg},
  marker: {flexDirection: 'row', alignItems: 'center', gap: 6},
  markerDot: {width: 7, height: 7, borderRadius: 1.5},
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
  perks: {gap: spacing.sm},
  perk: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  perkText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  action: {flex: 1},
});
