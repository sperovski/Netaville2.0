import type {ReactNode} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type ViewStyle,
} from 'react-native';
import {ChevronDown} from 'lucide-react-native';
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
};

/** A select that cycles through its options on tap — enough for a request form. */
export function SelectField({
  label,
  value,
  options,
  onChange,
  style,
}: SelectProps) {
  const advance = () => {
    const index = options.indexOf(value);
    const next = options[(index + 1) % options.length];
    if (next !== undefined) {
      onChange(next);
    }
  };

  return (
    <View style={[styles.group, style]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={advance}
        style={({pressed}) => [styles.field, pressed ? styles.pressed : null]}>
        <Text style={[styles.input, styles.selectValue]}>{value}</Text>
        <ChevronDown
          size={icon.size}
          strokeWidth={icon.strokeWidth}
          color={colors.textDim}
        />
      </Pressable>
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
});
