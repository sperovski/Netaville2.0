import {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {ArrowLeft, ChevronLeft, ChevronRight} from 'lucide-react-native';
import {AppIcon} from '@/components/AppIcon';
import {EventCard} from '@/components/EventCard';
import {IconButton} from '@/components/IconButton';
import {Screen} from '@/components/Screen';
import {SectionLabel} from '@/components/SectionLabel';
import {useRsvp} from '@/context/rsvp';
import {
  events,
  formatEventDate,
  formatMonth,
  parseIsoDate,
  toIsoDate,
  todayIso,
  type EventCategory,
} from '@/data/events';
import {colors, fonts, icon, radii, spacing, type as typography} from '@/theme';

/** Monday-first, the way the space's week runs. */
const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const dotColor: Record<EventCategory, string> = {
  Workshop: colors.cyan,
  Social: colors.coral,
  Quiz: colors.gold,
  Private: colors.textDim,
};

type Cell = {iso: string; day: number; inMonth: boolean};

/** Six rows of seven, padded with the neighbouring months' days. */
function buildMonth(cursor: Date): Cell[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // shift Sunday-first to Monday-first
  const start = new Date(first);
  start.setDate(first.getDate() - offset);

  return Array.from({length: 42}, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      iso: toIsoDate(date),
      day: date.getDate(),
      inMonth: date.getMonth() === cursor.getMonth(),
    };
  });
}

export default function CalendarScreen() {
  const router = useRouter();
  const {isGoing, toggleRsvp} = useRsvp();

  const today = todayIso();
  const [cursor, setCursor] = useState(() => {
    const now = parseIsoDate(today);
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selected, setSelected] = useState(today);

  const cells = useMemo(() => buildMonth(cursor), [cursor]);
  const byDay = useMemo(() => {
    const map = new Map<string, EventCategory[]>();
    for (const event of events) {
      map.set(event.isoDate, [...(map.get(event.isoDate) ?? []), event.category]);
    }
    return map;
  }, []);

  const dayEvents = events.filter(event => event.isoDate === selected);
  const shiftMonth = (delta: number) =>
    setCursor(current => new Date(current.getFullYear(), current.getMonth() + delta, 1));

  return (
    <Screen scroll>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Go back" onPress={() => router.back()}>
          <ArrowLeft size={19} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />
        </IconButton>
      </View>

      <View style={styles.intro}>
        <View style={styles.introRow}>
          <AppIcon name="calendar" color={colors.brandBlue} size={26} />
          <Text style={typography.display}>Calendar</Text>
        </View>
        <Text style={typography.body}>Everything happening at the space.</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.card}>
          <View style={styles.monthRow}>
            <Text style={styles.month}>{formatMonth(cursor)}</Text>
            <View style={styles.monthNav}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                onPress={() => shiftMonth(-1)}
                style={({pressed}) => [styles.navButton, pressed ? styles.pressed : null]}>
                <ChevronLeft size={18} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next month"
                onPress={() => shiftMonth(1)}
                style={({pressed}) => [styles.navButton, pressed ? styles.pressed : null]}>
                <ChevronRight size={18} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />
              </Pressable>
            </View>
          </View>

          <View style={styles.weekRow}>
            {WEEK_LABELS.map((label, index) => (
              <Text key={`${label}-${index}`} style={styles.weekLabel}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map(cell => {
              const categories = byDay.get(cell.iso) ?? [];
              const isSelected = cell.iso === selected;
              const isToday = cell.iso === today;

              return (
                <Pressable
                  key={cell.iso}
                  accessibilityRole="button"
                  onPress={() => setSelected(cell.iso)}
                  style={styles.cell}>
                  <View
                    style={[
                      styles.day,
                      isToday && !isSelected ? styles.dayToday : null,
                      isSelected ? styles.daySelected : null,
                    ]}>
                    <Text
                      style={[
                        styles.dayText,
                        cell.inMonth ? null : styles.dayOutside,
                        isSelected ? styles.dayTextSelected : null,
                      ]}>
                      {cell.day}
                    </Text>
                  </View>
                  <View style={styles.dots}>
                    {categories.slice(0, 3).map((category, index) => (
                      <View
                        key={`${cell.iso}-${index}`}
                        style={[styles.dot, {backgroundColor: dotColor[category]}]}
                      />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <SectionLabel>{formatEventDate(selected)}</SectionLabel>
        {dayEvents.length === 0 ? (
          <View style={styles.empty}>
            <Text style={typography.body}>Nothing booked on this day.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {dayEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                going={isGoing(event.id)}
                onPress={() => router.push(`/event/${event.id}`)}
                onToggleRsvp={() => toggleRsvp(event.id)}
              />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg},
  intro: {paddingHorizontal: spacing.xl, gap: spacing.xs, paddingBottom: spacing.xl},
  introRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  section: {paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.xl},
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  month: {
    fontFamily: fonts.bold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: colors.textInk,
  },
  monthNav: {flexDirection: 'row', gap: spacing.sm},
  navButton: {
    width: 34,
    height: 34,
    borderRadius: radii.iconButton,
    backgroundColor: colors.blueTintBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {flexDirection: 'row'},
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.textDim,
  },
  grid: {flexDirection: 'row', flexWrap: 'wrap'},
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  day: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: colors.blueTintBorder,
  },
  daySelected: {backgroundColor: colors.brandBlue},
  dayText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.textInk,
  },
  dayOutside: {color: colors.textDim, opacity: 0.55},
  dayTextSelected: {color: colors.textOnBrand, fontFamily: fonts.bold},
  dots: {flexDirection: 'row', gap: 3, height: 5},
  dot: {width: 5, height: 5, borderRadius: 2.5},
  list: {gap: spacing.md},
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radii.cardSm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl - 2,
  },
  pressed: {opacity: 0.7},
});
