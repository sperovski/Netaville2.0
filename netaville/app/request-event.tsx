import {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Clock, Minus, Plus, X} from 'lucide-react-native';
import {AppIcon} from '@/components/AppIcon';
import {FieldRow, FormField, SelectField} from '@/components/FormField';
import {PrimaryButton} from '@/components/PrimaryButton';
import {Screen} from '@/components/Screen';
import {SectionLabel} from '@/components/SectionLabel';
import {colors, fonts, icon, radii, spacing, type as typography} from '@/theme';

const rooms = ['Amphitheatre', 'Classroom', 'Cafeteria', 'Co-working floor'] as const;
const cateringOptions = ['None', 'Coffee & snacks', 'Full catering'] as const;
const ACTION_BAR_HEIGHT = 88;

export default function RequestEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [room, setRoom] = useState<string>(rooms[0]);
  const [catering, setCatering] = useState<string>(cateringOptions[0]);
  const [participants, setParticipants] = useState(20);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll bottomInset={ACTION_BAR_HEIGHT + insets.bottom}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={typography.h1}>Request an event</Text>
            <Text style={typography.body}>We&apos;ll review it and get back to you.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            style={({pressed}) => [styles.close, pressed ? styles.pressed : null]}>
            <X size={19} strokeWidth={icon.strokeWidth} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.form}>
          <FormField
            label="Event title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. React Native meetup"
          />

          <FieldRow>
            <FormField
              label="Date"
              value={date}
              onChangeText={setDate}
              placeholder="12 Sep"
              style={styles.flex}
              leadingIcon={
                <AppIcon name="calendar" color={colors.brandBlue} size={icon.size} />
              }
            />
            <FormField
              label="Time"
              value={time}
              onChangeText={setTime}
              placeholder="18:00"
              style={styles.flex}
              leadingIcon={
                <Clock size={icon.size} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />
              }
            />
          </FieldRow>

          <SelectField label="Room" value={room} options={rooms} onChange={setRoom} />
          <SelectField
            label="Catering"
            value={catering}
            options={cateringOptions}
            onChange={setCatering}
          />

          <View style={styles.stepperGroup}>
            <SectionLabel>Expected participants</SectionLabel>
            <View style={styles.stepper}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fewer participants"
                onPress={() => setParticipants(current => Math.max(1, current - 5))}
                style={({pressed}) => [
                  styles.stepButton,
                  styles.stepGhost,
                  pressed ? styles.pressed : null,
                ]}>
                <Minus size={18} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />
              </Pressable>
              <Text style={styles.stepValue}>{participants}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="More participants"
                onPress={() => setParticipants(current => current + 5)}
                style={({pressed}) => [
                  styles.stepButton,
                  styles.stepFilled,
                  pressed ? styles.pressed : null,
                ]}>
                <Plus size={18} strokeWidth={icon.strokeWidth} color={colors.textOnBrand} />
              </Pressable>
            </View>
          </View>
        </View>
      </Screen>

      <View style={[styles.actionBar, {paddingBottom: insets.bottom + spacing.md}]}>
        <PrimaryButton label="Send event request" onPress={() => router.back()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  headerText: {flex: 1, gap: spacing.xs},
  close: {
    width: 34,
    height: 34,
    borderRadius: radii.iconButton,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {paddingHorizontal: spacing.xl, gap: spacing.xl},
  flex: {flex: 1},
  stepperGroup: {gap: spacing.sm},
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGhost: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.blueTintBorder,
  },
  stepFilled: {backgroundColor: colors.brandBlue},
  stepValue: {
    fontFamily: fonts.extrabold,
    fontSize: 20,
    letterSpacing: -0.4,
    color: colors.textInk,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pressed: {opacity: 0.75},
});
