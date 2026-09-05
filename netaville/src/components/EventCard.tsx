import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Clock, MapPin} from 'lucide-react-native';
import {colors, fonts, icon, radii, spacing} from '@/theme';
import {isEventToday, parseIsoDate, type NetavilleEvent} from '@/data/events';
import {GhostButton} from './GhostButton';
import {PrimaryButton} from './PrimaryButton';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

type Props = {
  event: NetavilleEvent;
  going: boolean;
  onPress: () => void;
  onToggleRsvp: () => void;
};

export function EventCard({event, going, onPress, onToggleRsvp}: Props) {
  const date = parseIsoDate(event.isoDate);
  const today = isEventToday(event);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.card, pressed ? styles.pressed : null]}>
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
        {/* perforation down the tear edge */}
        <View style={styles.perforation} pointerEvents="none">
          {[0, 1, 2, 3, 4].map(dot => (
            <View
              key={dot}
              style={[styles.perfDot, today ? styles.perfDotToday : null]}
            />
          ))}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          <View style={styles.action}>
            {going ? (
              <PrimaryButton label="Going" size="sm" onPress={onToggleRsvp} />
            ) : (
              <GhostButton label="RSVP" size="sm" onPress={onToggleRsvp} />
            )}
          </View>
        </View>

        <View style={styles.meta}>
          <Text style={styles.time}>{event.startTime}</Text>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <Clock size={13} strokeWidth={icon.strokeWidth} color={colors.textDim} />
            <Text style={styles.metaText}>{event.durationLabel}</Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <MapPin size={13} strokeWidth={icon.strokeWidth} color={colors.textDim} />
            <Text style={styles.metaText} numberOfLines={1}>
              {event.room}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg - 2,
  },
  stub: {
    width: 52,
    borderRadius: radii.cardSm - 4,
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
  perforation: {
    position: 'absolute',
    right: 3,
    top: 22,
    bottom: 5,
    justifyContent: 'space-between',
  },
  perfDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.blueTintBorder,
  },
  perfDotToday: {backgroundColor: colors.coralTintBorder},
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
  body: {flex: 1, gap: spacing.sm},
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.3,
    color: colors.textInk,
  },
  action: {flexShrink: 0, paddingTop: 1},
  meta: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm - 2},
  time: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  metaItem: {flexDirection: 'row', alignItems: 'center', gap: 4},
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.border,
  },
  metaText: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  pressed: {opacity: 0.92},
});
