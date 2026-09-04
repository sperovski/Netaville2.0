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
      {/* date rail — gives the list a spine you can scan down */}
      <View style={[styles.rail, today ? styles.railToday : null]}>
        <Text style={[styles.day, today ? styles.dayToday : null]}>
          {date.getDate()}
        </Text>
        <Text style={[styles.month, today ? styles.monthToday : null]}>
          {MONTHS[date.getMonth()]}
        </Text>
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
  rail: {
    width: 46,
    paddingVertical: spacing.sm,
    borderRadius: radii.cardSm - 4,
    backgroundColor: colors.blueTintBg,
    alignItems: 'center',
  },
  railToday: {backgroundColor: colors.brandBlue},
  day: {
    fontFamily: fonts.extrabold,
    fontSize: 19,
    letterSpacing: -0.6,
    color: colors.brandBlue,
  },
  dayToday: {color: colors.textOnBrand},
  month: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.brandBlue,
    opacity: 0.75,
  },
  monthToday: {color: colors.textOnBrand, opacity: 0.85},
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
