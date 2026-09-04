import {Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {
  ArrowLeft,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  ShieldCheck,
  Twitter,
} from 'lucide-react-native';
import {GhostButton} from '@/components/GhostButton';
import {IconButton} from '@/components/IconButton';
import {ListRow} from '@/components/ListRow';
import {Screen} from '@/components/Screen';
import {SectionLabel} from '@/components/SectionLabel';
import {colors, fonts, icon, radii, spacing, type as typography} from '@/theme';

const hours = [
  {days: 'Monday – Friday', time: '08:00 – 22:00'},
  {days: 'Saturday', time: '10:00 – 18:00'},
];

const socials = [
  {key: 'facebook', label: 'Facebook', Icon: Facebook},
  {key: 'instagram', label: 'Instagram', Icon: Instagram},
  {key: 'x', label: 'X', Icon: Twitter},
  {key: 'linkedin', label: 'LinkedIn', Icon: Linkedin},
] as const;

export default function AboutScreen() {
  const router = useRouter();

  return (
    <Screen scroll>
      <View style={styles.back}>
        <IconButton accessibilityLabel="Go back" onPress={() => router.back()}>
          <ArrowLeft size={19} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />
        </IconButton>
      </View>
      <View style={styles.header}>
        <Text style={typography.display}>About Netaville</Text>
      </View>

      <View style={styles.section}>
        <SectionLabel tone={colors.brandBlue}>Location</SectionLabel>
        <View style={styles.card}>
          <Text style={styles.address}>Nikola Tesla 9, Karposh 2</Text>
          <Text style={styles.addressMuted}>1000 Skopje, Macedonia</Text>
          <GhostButton
            label="Show on map"
            size="sm"
            style={styles.mapButton}
            icon={
              <MapPin size={16} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />
            }
            onPress={() =>
              void Linking.openURL(
                'https://maps.apple.com/?q=Nikola+Tesla+9,+Karposh+2,+Skopje',
              )
            }
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionLabel tone={colors.gold}>Opening hours</SectionLabel>
        <View style={styles.card}>
          {hours.map((entry, index) => (
            <View
              key={entry.days}
              style={[styles.hourRow, index === 0 ? styles.hourRowDivided : null]}>
              <Text style={styles.hourDays}>{entry.days}</Text>
              <Text style={styles.hourTime}>{entry.time}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionLabel tone={colors.cyan}>Get in touch</SectionLabel>
        <ListRow
          icon={<Mail size={20} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />}
          label="contact@netaville.mk"
          onPress={() => void Linking.openURL('mailto:contact@netaville.mk')}
        />
      </View>

      <View style={styles.section}>
        <SectionLabel tone={colors.brandBlue}>Follow</SectionLabel>
        <View style={styles.socials}>
          {socials.map(({key, label, Icon}) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={label}
              style={({pressed}) => [styles.social, pressed ? styles.pressed : null]}>
              <Icon size={20} strokeWidth={icon.strokeWidth} color={colors.brandBlue} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionLabel tone={colors.coral}>Community</SectionLabel>
        <ListRow
          tone="coral"
          icon={
            <ShieldCheck size={20} strokeWidth={icon.strokeWidth} color={colors.coralText} />
          }
          label="Code of conduct"
          value="How we treat each other here"
        />
        <Text style={styles.credit}>
          Avatars: DiceBear &ldquo;Croodles Neutral&rdquo; by vijay verma, CC BY 4.0
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {paddingHorizontal: spacing.xl, paddingTop: spacing.md},
  header: {paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.lg},
  section: {paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.xl},
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl - 2,
    gap: spacing.xs,
  },
  address: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: -0.2,
    color: colors.textInk,
  },
  addressMuted: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  mapButton: {alignSelf: 'flex-start', marginTop: spacing.md},
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  hourRowDivided: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  hourDays: {
    fontFamily: fonts.medium,
    fontSize: 14.5,
    color: colors.textMuted,
  },
  hourTime: {
    fontFamily: fonts.bold,
    fontSize: 14.5,
    color: colors.textInk,
  },
  credit: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.textDim,
    paddingTop: spacing.xs,
  },
  socials: {flexDirection: 'row', gap: spacing.md},
  social: {
    width: 52,
    height: 52,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {opacity: 0.7},
});
