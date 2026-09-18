import {useMemo, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import {Check, Clock} from 'lucide-react-native';
import {PickerSheet} from '@/components/PickerSheet';
import {colors, fonts, icon, radii, spacing} from '@/theme';

type Props = {
  label: string;
  /** `HH:MM`, or '' when unset. */
  startTime: string;
  endTime: string;
  onChange: (next: {startTime: string; endTime: string}) => void;
  style?: ViewStyle;
};

const STEP_MINUTES = 15;
const FIRST_HOUR = 7;
const LAST_HOUR = 23;

/** Every quarter hour from 07:00 to 23:45, as `HH:MM`. */
const SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = FIRST_HOUR; h <= LAST_HOUR; h += 1) {
    for (let m = 0; m < 60; m += STEP_MINUTES) {
      out.push(`${`${h}`.padStart(2, '0')}:${`${m}`.padStart(2, '0')}`);
    }
  }
  return out;
})();

const ROW_HEIGHT = 44;

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h! * 60 + m! + minutes) % (24 * 60);
  const hh = Math.floor(total / 60);
  return `${`${hh}`.padStart(2, '0')}:${`${total % 60}`.padStart(2, '0')}`;
}

/**
 * A time field that opens two lists — one to start, one to end — instead of a
 * text box. Picking a start that lands on or after the current end pushes the
 * end out to start + 2h, so the range is always valid by the time it closes.
 */
export function TimeRangeField({
  label,
  startTime,
  endTime,
  onChange,
  style,
}: Props) {
  const [open, setOpen] = useState(false);

  const set = startTime.length > 0 && endTime.length > 0;
  const summary = set ? `${startTime} – ${endTime}` : 'Pick a time';

  const draftStart = startTime.length > 0 ? startTime : '18:00';
  const draftEnd = endTime.length > 0 ? endTime : '20:00';

  const openSheet = () => {
    // Seed a sensible range on first open, so closing the sheet without
    // touching a row still leaves a valid time rather than "Pick a time".
    if (startTime.length === 0 || endTime.length === 0) {
      onChange({startTime: draftStart, endTime: draftEnd});
    }
    setOpen(true);
  };

  // Ends that come after the chosen start; the list can't offer an invalid one.
  const endOptions = useMemo(
    () => SLOTS.filter(slot => slot > draftStart),
    [draftStart],
  );

  const pickStart = (next: string) => {
    const nextEnd = draftEnd > next ? draftEnd : addMinutes(next, 120);
    onChange({startTime: next, endTime: nextEnd});
  };

  const pickEnd = (next: string) => {
    onChange({startTime: draftStart, endTime: next});
  };

  return (
    <View style={[styles.group, style]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${set ? summary : 'not set'}`}
        onPress={openSheet}
        style={({pressed}) => [styles.field, pressed ? styles.pressed : null]}>
        <Clock
          size={icon.size}
          strokeWidth={icon.strokeWidth}
          color={colors.brandBlue}
        />
        <Text style={[styles.value, !set ? styles.placeholder : null]}>
          {summary}
        </Text>
      </Pressable>

      <PickerSheet visible={open} title="Pick a time" onClose={() => setOpen(false)}>
        <View style={styles.columns}>
          <TimeColumn
            heading="Starts"
            options={SLOTS}
            selected={draftStart}
            onSelect={pickStart}
          />
          <TimeColumn
            heading="Ends"
            options={endOptions}
            selected={draftEnd}
            onSelect={pickEnd}
          />
        </View>
      </PickerSheet>
    </View>
  );
}

function TimeColumn({
  heading,
  options,
  selected,
  onSelect,
}: {
  heading: string;
  options: string[];
  selected: string;
  onSelect: (time: string) => void;
}) {
  return (
    <View style={styles.column}>
      <Text style={styles.columnHeading}>{heading}</Text>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}>
        {options.map(option => {
          const on = option === selected;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{selected: on}}
              onPress={() => onSelect(option)}
              style={({pressed}) => [
                styles.row,
                on ? styles.rowOn : null,
                pressed ? styles.pressed : null,
              ]}>
              <Text style={[styles.rowText, on ? styles.rowTextOn : null]}>
                {option}
              </Text>
              {on ? (
                <Check size={15} strokeWidth={2.6} color={colors.textOnBrand} />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
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
  columns: {flexDirection: 'row', gap: spacing.md},
  column: {flex: 1, gap: spacing.sm},
  columnHeading: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textDim,
    textAlign: 'center',
  },
  list: {
    height: ROW_HEIGHT * 5.5,
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listContent: {padding: 6, gap: 4},
  row: {
    height: ROW_HEIGHT - 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.control - 4,
  },
  rowOn: {backgroundColor: colors.brandBlue},
  rowText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.textInk,
  },
  rowTextOn: {color: colors.textOnBrand, fontFamily: fonts.bold},
});
