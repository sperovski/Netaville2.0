import {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View, type ViewStyle} from 'react-native';
import {ChevronLeft, ChevronRight} from 'lucide-react-native';
import {AppIcon} from '@/components/AppIcon';
import {PickerSheet} from '@/components/PickerSheet';
import {
  formatEventDate,
  formatMonth,
  parseIsoDate,
  toIsoDate,
  todayIso,
} from '@/data/events';
import {colors, fonts, icon, radii, spacing} from '@/theme';

type Props = {
  label: string;
  /** ISO `YYYY-MM-DD`, or '' when nothing is chosen yet. */
  value: string;
  onChange: (iso: string) => void;
  /** Earliest selectable day, ISO. Defaults to today. */
  minIso?: string;
  style?: ViewStyle;
};

/** Monday-first, matching the calendar screen. */
const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type Cell = {iso: string; day: number; inMonth: boolean};

/** Six rows of seven, padded with the neighbouring months' days. */
function buildMonth(cursor: Date): Cell[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Sunday-first → Monday-first
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

/**
 * A date field that opens a month calendar rather than a text box. Days before
 * `minIso` are dimmed and inert, so a request can only ever propose a date that
 * is still to come.
 */
export function DateField({label, value, onChange, minIso, style}: Props) {
  const [open, setOpen] = useState(false);
  const min = minIso ?? todayIso();

  const [cursor, setCursor] = useState(() => {
    const base = parseIsoDate(value.length > 0 ? value : min);
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const cells = useMemo(() => buildMonth(cursor), [cursor]);
  const shiftMonth = (delta: number) =>
    setCursor(
      current => new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );

  const atMinMonth =
    cursor.getFullYear() === parseIsoDate(min).getFullYear() &&
    cursor.getMonth() === parseIsoDate(min).getMonth();

  const openSheet = () => {
    // Jump the calendar to the chosen month (or the first allowed one) each
    // time it opens, so it never lingers on a month the user browsed away to.
    const base = parseIsoDate(value.length > 0 ? value : min);
    setCursor(new Date(base.getFullYear(), base.getMonth(), 1));
    setOpen(true);
  };

  return (
    <View style={[styles.group, style]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${
          value.length > 0 ? formatEventDate(value) : 'not set'
        }`}
        onPress={openSheet}
        style={({pressed}) => [styles.field, pressed ? styles.pressed : null]}>
        <AppIcon name="calendar" color={colors.brandBlue} size={icon.size} />
        <Text style={[styles.value, value.length === 0 ? styles.placeholder : null]}>
          {value.length > 0 ? formatEventDate(value) : 'Pick a date'}
        </Text>
        <ChevronRight
          size={icon.size}
          strokeWidth={icon.strokeWidth}
          color={colors.textDim}
        />
      </Pressable>

      <PickerSheet
        visible={open}
        title="Pick a date"
        onClose={() => setOpen(false)}>
        <View style={styles.card}>
          <View style={styles.monthRow}>
            <Text style={styles.month}>{formatMonth(cursor)}</Text>
            <View style={styles.monthNav}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                disabled={atMinMonth}
                onPress={() => shiftMonth(-1)}
                style={({pressed}) => [
                  styles.navButton,
                  atMinMonth ? styles.navDisabled : null,
                  pressed ? styles.pressed : null,
                ]}>
                <ChevronLeft
                  size={18}
                  strokeWidth={icon.strokeWidth}
                  color={atMinMonth ? colors.textDim : colors.brandBlue}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next month"
                onPress={() => shiftMonth(1)}
                style={({pressed}) => [
                  styles.navButton,
                  pressed ? styles.pressed : null,
                ]}>
                <ChevronRight
                  size={18}
                  strokeWidth={icon.strokeWidth}
                  color={colors.brandBlue}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.weekRow}>
            {WEEK_LABELS.map((weekLabel, index) => (
              <Text key={`${weekLabel}-${index}`} style={styles.weekLabel}>
                {weekLabel}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map(cell => {
              const isSelected = cell.iso === value;
              const isToday = cell.iso === todayIso();
              const disabled = cell.iso < min;

              return (
                <Pressable
                  key={cell.iso}
                  accessibilityRole="button"
                  disabled={disabled}
                  onPress={() => {
                    onChange(cell.iso);
                    setOpen(false);
                  }}
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
                        !cell.inMonth ? styles.dayOutside : null,
                        disabled ? styles.dayDisabled : null,
                        isSelected ? styles.dayTextSelected : null,
                      ]}>
                      {cell.day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </PickerSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {gap: spacing.sm},
  label: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg - 2,
    height: 50,
  },
  value: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.textInk,
  },
  placeholder: {color: colors.textDim},
  pressed: {opacity: 0.72},
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
  navDisabled: {backgroundColor: colors.divider},
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
  },
  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {borderWidth: 1.5, borderColor: colors.blueTintBorder},
  daySelected: {backgroundColor: colors.brandBlue},
  dayText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.textInk,
  },
  dayOutside: {color: colors.textDim, opacity: 0.55},
  dayDisabled: {color: colors.textDim, opacity: 0.35},
  dayTextSelected: {color: colors.textOnBrand, fontFamily: fonts.bold},
});
