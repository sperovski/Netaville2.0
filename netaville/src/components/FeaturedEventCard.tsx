import {Pressable, StyleSheet, Text, View} from 'react-native';
import {CalendarDays, Clock, MapPin, Tag} from 'lucide-react-native';
import {AvatarStack} from './AvatarStack';
import {BrandMotif} from './BrandMotif';
import {PrimaryButton} from './PrimaryButton';
import {formatEventDate, type NetavilleEvent} from '@/data/events';
import {colors, fonts, icon, radii, spacing} from '@/theme';

type Props = {
  event: NetavilleEvent;
  going: boolean;
  goingCount: number;
  onPress: () => void;
};

/**
 * The "next up" hero. The fan behind it is the logo's own ray geometry, bled
 * off the corner — the card carries the brand instead of a generic tint.
 */
export function FeaturedEventCard({event, going, goingCount, onPress}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.card, pressed ? styles.pressed : null]}>
      <BrandMotif
        name="rays"
        color={colors.featureRay}
        size={210}
        rotation={208}
        opacity={0.13}
        position={styles.rays}
      />

      <View style={styles.tagRow}>
        <View style={styles.tag}>
          <CalendarDays
            size={13}
            strokeWidth={icon.strokeWidth}
            color={colors.coralText}
          />
          <Text style={[styles.tagText, {color: colors.coralText}]}>
            {formatEventDate(event.isoDate)} · {event.startTime}
          </Text>
        </View>
        <View style={styles.tag}>
          <Tag
            size={13}
            strokeWidth={icon.strokeWidth}
            color={colors.cyanText}
          />
          <Text style={[styles.tagText, {color: colors.cyanText}]}>
            {event.category}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>{event.title}</Text>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Clock
            size={14}
            strokeWidth={icon.strokeWidth}
            color={colors.featureText}
          />
          <Text style={styles.metaText}>{event.durationLabel}</Text>
        </View>
        <View style={styles.metaItem}>
          <MapPin
            size={14}
            strokeWidth={icon.strokeWidth}
            color={colors.featureText}
          />
          <Text style={styles.metaText}>{event.room}</Text>
        </View>
      </View>

      <View style={styles.rule} />

      <View style={styles.attendees}>
        <AvatarStack count={goingCount} seedKey={event.id} size={30} />
        <Text style={styles.going}>{goingCount} going</Text>
      </View>

      {/* Opening the event is the only action here. Saying yes lives on its
          own page, where the choice can be confirmed rather than toggled. */}
      <PrimaryButton
        label={going ? "View event · you're going" : 'View event'}
        variant={going ? 'primary' : 'secondary'}
        full
        onPress={onPress}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.featureBg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.featureBorder,
    padding: spacing.xl,
    gap: spacing.md,
    overflow: 'hidden',
  },
  rays: {
    position: 'absolute',
    top: -62,
    right: -74,
  },
  tagRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.lg},
  tag: {flexDirection: 'row', alignItems: 'center', gap: 6},
  tagText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.7,
    color: colors.textInk,
    marginTop: 2,
  },
  meta: {flexDirection: 'row', alignItems: 'center', gap: spacing.lg},
  metaItem: {flexDirection: 'row', alignItems: 'center', gap: 6},
  metaText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.featureText,
  },
  rule: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.featureBorder,
    marginTop: spacing.xs,
  },
  attendees: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  going: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.featureText,
  },
  pressed: {opacity: 0.94},
});
