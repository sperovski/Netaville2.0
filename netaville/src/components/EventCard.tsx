import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Clock, MapPin, Tag} from 'lucide-react-native';
import {colors, fonts, icon, radii, spacing} from '@/theme';
import {isEventToday, parseIsoDate, type NetavilleEvent} from '@/data/events';
import {PrimaryButton} from './PrimaryButton';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

type Props = {
  event: NetavilleEvent;
  going: boolean;
  onPress: () => void;
};

/** One fact with the icon that names it — no bullet needed to separate them. */
function Meta({children, label}: {children: React.ReactNode; label: string}) {
  return (
    <View style={styles.metaItem}>
      {children}
      <Text style={styles.metaText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function EventCard({event, going, onPress}: Props) {
  const date = parseIsoDate(event.isoDate);
  const today = isEventToday(event);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.card, pressed ? styles.pressed : null]}>
      <View style={styles.head}>
        {/* date stub — a torn-off ticket, so the list has a spine you can scan */}
        <View style={[styles.stub, today ? styles.stubToday : null]}>
          <View style={[styles.stubBand, today ? styles.stubBandToday : null]}>
            <Text style={styles.stubBandText}>
              {today ? 'Today' : WEEKDAYS[date.getDay()]}
            </Text>
          </View>
          <View style={styles.stubBody}>
            <Text style={[styles.day, today ? styles.dayToday : null]}>
              {date.getDate()}
            </Text>
            <Text style={[styles.month, today ? styles.monthToday : null]}>
              {MONTHS[date.getMonth()]}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>

          <View style={styles.meta}>
            <Meta label={`${event.startTime} · ${event.durationLabel}`}>
              <Clock
                size={13}
                strokeWidth={icon.strokeWidth}
                color={colors.textDim}
              />
            </Meta>
            <Meta label={event.category}>
              <Tag
                size={13}
                strokeWidth={icon.strokeWidth}
                color={colors.textDim}
              />
            </Meta>
          </View>

          <View style={styles.meta}>
            <Meta label={event.room}>
              <MapPin
                size={13}
                strokeWidth={icon.strokeWidth}
                color={colors.textDim}
              />
            </Meta>
          </View>
        </View>
      </View>

      {/* One action, the width of the card: open it. Saying yes belongs on the
          event's own page, where there is room to confirm it. */}
      <PrimaryButton
        label={going ? "View event · you're going" : 'View event'}
        variant={going ? 'primary' : 'secondary'}
        size="sm"
        full
        onPress={onPress}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg - 2,
  },
  head: {flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md},
  stub: {
    width: 52,
    borderRadius: radii.cardSm,
    borderWidth: 1,
    borderColor: colors.blueTintBorder,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  stubToday: {borderColor: colors.coralTintBorder},
  stubBand: {
    backgroundColor: colors.brandBlue,
    paddingVertical: 3,
    alignItems: 'center',
  },
  stubBandToday: {backgroundColor: colors.coral},
  stubBandText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.textOnBrand,
  },
  stubBody: {
    paddingTop: 5,
    paddingBottom: 7,
    alignItems: 'center',
    gap: 1,
  },
  day: {
    fontFamily: fonts.extrabold,
    fontSize: 21,
    lineHeight: 24,
    letterSpacing: -0.8,
    color: colors.textInk,
  },
  dayToday: {color: colors.coralText},
  month: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  monthToday: {color: colors.coralText, opacity: 0.8},
  body: {flex: 1, gap: 6},
  title: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.3,
    color: colors.textInk,
  },
  meta: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  metaItem: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  pressed: {opacity: 0.92},
});
