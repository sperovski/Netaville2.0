import {useState, type ReactNode} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import {Check, ChevronDown} from 'lucide-react-native';
import {PickerSheet} from '@/components/PickerSheet';
import {colors, fonts, icon, radii, spacing} from '@/theme';

type BaseProps = {
  label: string;
  style?: ViewStyle;
};

type TextFieldProps = BaseProps & {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  leadingIcon?: ReactNode;
  keyboardType?: KeyboardTypeOptions;
  /** Grows to a few lines, for a description or a note. */
  multiline?: boolean;
  /** Masks the input, for a password. */
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  /** iOS keychain / autofill hint, e.g. 'emailAddress' or 'password'. */
  textContentType?: TextInputProps['textContentType'];
  autoComplete?: TextInputProps['autoComplete'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
};

/** A labelled text input in the shared white/rounded field style. */
export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  leadingIcon,
  keyboardType,
  multiline = false,
  secureTextEntry = false,
  autoCapitalize,
  textContentType,
  autoComplete,
  returnKeyType,
  onSubmitEditing,
  style,
}: TextFieldProps) {
  return (
    <View style={[styles.group, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, multiline ? styles.fieldMultiline : null]}>
        {leadingIcon}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textDim}
          keyboardType={keyboardType}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={!secureTextEntry && autoCapitalize !== 'none'}
          textContentType={textContentType}
          autoComplete={autoComplete}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          // Without this the cursor sits centred on iOS and the first line
          // drifts down as the box grows.
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[styles.input, multiline ? styles.inputMultiline : null]}
        />
      </View>
    </View>
  );
}

type SelectProps = BaseProps & {
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
  /** Sheet heading; defaults to the field label. */
  title?: string;
};

/**
 * A select that opens a sheet of its options and marks the current one, rather
 * than cycling blindly on each tap. Same rounded field as the text inputs.
 */
export function SelectField({
  label,
  value,
  options,
  onChange,
  title,
  style,
}: SelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.group, style]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        onPress={() => setOpen(true)}
        style={({pressed}) => [styles.field, pressed ? styles.pressed : null]}>
        <Text style={[styles.input, styles.selectValue]}>{value}</Text>
        <ChevronDown
          size={icon.size}
          strokeWidth={icon.strokeWidth}
          color={colors.textDim}
        />
      </Pressable>

      <PickerSheet
        visible={open}
        title={title ?? label}
        onClose={() => setOpen(false)}>
        <ScrollView
          style={styles.optionList}
          contentContainerStyle={styles.optionListContent}
          showsVerticalScrollIndicator={false}>
          {options.map(option => {
            const on = option === value;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{selected: on}}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
                style={({pressed}) => [
                  styles.option,
                  on ? styles.optionOn : null,
                  pressed ? styles.pressed : null,
                ]}>
                <Text
                  style={[styles.optionText, on ? styles.optionTextOn : null]}>
                  {option}
                </Text>
                {on ? (
                  <Check
                    size={17}
                    strokeWidth={2.6}
                    color={colors.brandBlue}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </PickerSheet>
    </View>
  );
}

type FieldRowProps = {children: ReactNode};

export function FieldRow({children}: FieldRowProps) {
  return <View style={styles.row}>{children}</View>;
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
  fieldMultiline: {
    height: undefined,
    minHeight: 92,
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  inputMultiline: {lineHeight: 21},
  input: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.textInk,
    padding: 0,
  },
  selectValue: {
    lineHeight: 20,
  },
  row: {flexDirection: 'row', gap: spacing.md},
  pressed: {opacity: 0.75},
  optionList: {maxHeight: 320},
  optionListContent: {gap: spacing.sm, paddingBottom: spacing.xs},
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  optionOn: {borderColor: colors.brandBlue, backgroundColor: colors.blueTintBg},
  optionText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.textInk,
  },
  optionTextOn: {color: colors.brandBlue, fontFamily: fonts.bold},
});
