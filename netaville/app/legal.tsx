import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ArrowLeft} from 'lucide-react-native';
import {colors, fonts, icon, radii, spacing} from '@/theme';

/**
 * Privacy and terms, in the app rather than behind a link.
 *
 * The App Store asks for a privacy policy either way, and a phone in a café
 * with no signal should still be able to read what the app keeps about its
 * owner. One screen serves both, chosen by a route param, because the two are
 * short and share every style.
 */

type Section = {heading: string; body: string};

const PRIVACY: Section[] = [
  {
    heading: 'What we keep',
    body: 'Your name and email address, the stamps and free coffees on your card, the events you say you are coming to, and the requests you send us. That is the whole list.',
  },
  {
    heading: 'Why we keep it',
    body: 'The card has to remember how many stamps you have collected, and the counter has to be able to look it up when you show your code. Events need to know who is coming so there is enough coffee.',
  },
  {
    heading: 'Your student status',
    body: 'A UKIM email address is what earns the student price. We check that you can receive mail at that address when you sign up, and after that we only store the address itself.',
  },
  {
    heading: 'What we never do',
    body: 'We do not sell anything about you, we do not run advertising trackers, and we do not ask for your location, camera, contacts or photos.',
  },
  {
    heading: 'Who can see it',
    body: 'Netaville staff can see your name, email and stamp card in the admin panel, because that is how a stamp gets added and a free coffee gets handed over. Nobody outside Netaville has access.',
  },
  {
    heading: 'Deleting your account',
    body: 'Write to us and we will remove your account and everything attached to it. Signing out on all devices from your profile ends every session immediately in the meantime.',
  },
];

const TERMS: Section[] = [
  {
    heading: 'The card',
    body: 'Ten stamps earn one free coffee. Stamps are added by staff at the counter when you show your code. Codes refresh every minute, so a screenshot sent to a friend will not work.',
  },
  {
    heading: 'Free coffees',
    body: 'A banked free coffee has no cash value and cannot be exchanged for money. We may set a fair limit on how many are claimed in one visit.',
  },
  {
    heading: 'Student prices',
    body: 'Student pricing is for people with a working UKIM address. If an address stops being valid, the discount goes with it.',
  },
  {
    heading: 'Events',
    body: 'Saying you are coming helps us plan. Rooms have limits, and a request for an event is a request, not a booking, until we approve it.',
  },
  {
    heading: 'Behaving',
    body: 'Netaville is a shared space. We can deactivate an account that abuses the scheme, and a deactivated account keeps its history but stops collecting.',
  },
  {
    heading: 'Changes',
    body: 'If these terms change in a way that matters, we will say so in the app before the change takes effect.',
  },
];

export default function LegalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{doc?: string}>();
  const terms = params.doc === 'terms';

  const title = terms ? 'Terms' : 'Privacy & data';
  const intro = terms
    ? 'The short version of how the card, the discount and the events work.'
    : 'Netaville keeps as little about you as it can. Here is all of it.';
  const sections = terms ? TERMS : PRIVACY;

  return (
    <View style={styles.root}>
      <View style={[styles.header, {paddingTop: insets.top + spacing.md}]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.back}>
          <ArrowLeft
            size={20}
            strokeWidth={icon.strokeWidth}
            color={colors.brandBlue}
          />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.intro}>{intro}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.body,
          {paddingBottom: insets.bottom + spacing.xxl},
        ]}
        showsVerticalScrollIndicator={false}>
        {sections.map(section => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading}>{section.heading}</Text>
            <Text style={styles.text}>{section.body}</Text>
          </View>
        ))}
        <Text style={styles.footer}>
          Questions about any of this? Ask us at the counter.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.bg},
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: radii.iconButton,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 30,
    letterSpacing: -1,
    color: colors.textInk,
  },
  intro: {
    fontFamily: fonts.medium,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.textMuted,
  },
  body: {paddingHorizontal: spacing.xl, gap: spacing.xl},
  section: {gap: spacing.sm},
  heading: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: -0.3,
    color: colors.textInk,
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 14.5,
    lineHeight: 22,
    color: colors.textMuted,
  },
  footer: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textDim,
  },
});
