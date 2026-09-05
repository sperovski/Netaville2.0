import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Clock, MapPin} from 'lucide-react-native';
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
  onToggleRsvp: () => void;
};

/**
 * The "next up" hero. The fan behind it is the logo's own ray geometry, bled
 * off the corner — the card carries the brand instead of a generic tint.
 */
export function FeaturedEventCard({
  event,
  going,
  goingCount,
  onPress,
  onToggleRsvp,
}: Props) {
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
          <View style={[styles.marker, {backgroundColor: colors.coral}]} />
          <Text style={[styles.tagText, {color: colors.coralText}]}>
            {formatEventDate(event.isoDate)} · {event.startTime}
          </Text>
        </View>
        <View style={styles.tag}>
          <View style={[styles.marker, {backgroundColor: colors.cyan}]} />
          <Text style={[styles.tagText, {color: colors.cyanText}]}>{event.category}</Text>
        </View>
      </View>

      <Text style={styles.title}>{event.title}</Text>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Clock size={14} strokeWidth={icon.strokeWidth} color={colors.featureText} />
          <Text style={styles.metaText}>{event.durationLabel}</Text>
        </View>
        <View style={styles.metaDot} />
        <View style={styles.metaItem}>
          <MapPin size={14} strokeWidth={icon.strokeWidth} color={colors.featureText} />
          <Text style={styles.metaText}>{event.room}</Text>
        </View>
      </View>

      <View style={styles.rule} />

      <View style={styles.footer}>
        <View style={styles.attendees}>
          <AvatarStack count={goingCount} seedKey={event.id} size={30} />
          <Text style={styles.going}>{goingCount} going</Text>
        </View>
        <PrimaryButton
          label={going ? 'Going' : "I'm going"}
          size="sm"
          onPress={onToggleRsvp}
        />
      </View>
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
  marker: {width: 7, height: 7, borderRadius: 1.5},
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
  meta: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  metaItem: {flexDirection: 'row', alignItems: 'center', gap: 6},
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.featureBorder,
  },
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  attendees: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  going: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.featureText,
  },
  pressed: {opacity: 0.94},
});
