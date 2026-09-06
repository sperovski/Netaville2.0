import {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useRouter} from 'expo-router';
import {Plus, Users} from 'lucide-react-native';
import {AppIcon} from '@/components/AppIcon';
import {Chip} from '@/components/Chip';
import {EventCard} from '@/components/EventCard';
import {FriendsModal} from '@/components/FriendsModal';
import {FeaturedEventCard} from '@/components/FeaturedEventCard';
import {IconButton} from '@/components/IconButton';
import {Screen} from '@/components/Screen';
import {SectionLabel} from '@/components/SectionLabel';
import {Wordmark} from '@/components/Wordmark';
import {useRsvp} from '@/context/rsvp';
import {isEventToday, isThisWeek, type NetavilleEvent} from '@/data/events';
import {colors, fonts, icon, radii, spacing, type as typography} from '@/theme';

const filters = ['All', 'This week', 'Workshops', 'Social'] as const;
type Filter = (typeof filters)[number];

function matchesFilter(event: NetavilleEvent, filter: Filter): boolean {
  switch (filter) {
    case 'All':
      return true;
    case 'This week':
      return isThisWeek(event);
    case 'Workshops':
      return event.category === 'Workshop';
    case 'Social':
      return event.category === 'Social';
  }
}

export default function EventsScreen() {
  const router = useRouter();
  const {events, status, error, stale, refresh, isGoing, goingCount} =
    useRsvp();
  const [filter, setFilter] = useState<Filter>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const featured = events.find(isEventToday) ?? events[0];
  const upcoming = useMemo(
    () =>
      events.filter(
        event => event.id !== featured?.id && matchesFilter(event, filter),
      ),
    [events, featured?.id, filter],
  );

  // First load with nothing to show yet: a spinner rather than an empty page.
  if (status === 'loading' && events.length === 0) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brandBlue} />
        </View>
      </Screen>
    );
  }

  if (!featured) {
    return null;
  }

  const featuredGoing = isGoing(featured.id);

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={colors.brandBlue}
        />
      }>
      <View style={styles.header}>
        <Wordmark />
        <View style={styles.headerActions}>
          <IconButton
            accessibilityLabel="Friends"
            onPress={() => setFriendsOpen(true)}>
            <Users
              size={19}
              strokeWidth={icon.strokeWidth}
              color={colors.brandBlue}
            />
          </IconButton>
          <IconButton
            accessibilityLabel="Open calendar"
            onPress={() => router.push('/calendar')}>
            <AppIcon name="calendar" color={colors.brandBlue} size={19} />
          </IconButton>
          <IconButton
            accessibilityLabel="Request an event"
            onPress={() => router.push('/request-event')}>
            <Plus
              size={19}
              strokeWidth={icon.strokeWidth}
              color={colors.brandBlue}
            />
          </IconButton>
        </View>
      </View>

      <View style={styles.intro}>
        <Text style={typography.display}>What&apos;s on</Text>
        <Text style={typography.body}>
          {events.length === 1
            ? '1 upcoming event'
            : `${events.length} upcoming events`}
        </Text>
      </View>

      {error === null ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry loading events"
          onPress={() => void refresh()}
          style={styles.notice}>
          <Text style={styles.noticeText}>{error}</Text>
          <Text style={styles.noticeAction}>
            {stale ? 'Tap to retry' : 'Tap to try again'}
          </Text>
        </Pressable>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}>
        {filters.map(candidate => (
          <Chip
            key={candidate}
            label={candidate}
            tone="blue"
            active={candidate === filter}
            onPress={() => setFilter(candidate)}
          />
        ))}
      </ScrollView>

      <View style={styles.section}>
        <SectionLabel>Next up</SectionLabel>
        <FeaturedEventCard
          event={featured}
          going={featuredGoing}
          goingCount={goingCount(featured.id)}
          onPress={() => router.push(`/event/${featured.id}`)}
        />
      </View>

      <View style={styles.section}>
        <SectionLabel>Upcoming</SectionLabel>
        <View style={styles.list}>
          {upcoming.map(event => (
            <EventCard
              key={event.id}
              event={event}
              going={isGoing(event.id)}
              onPress={() => router.push(`/event/${event.id}`)}
            />
          ))}
          {upcoming.length === 0 ? (
            <Text style={[typography.body, styles.empty]}>
              Nothing matches that filter yet.
            </Text>
          ) : null}
        </View>
      </View>

      <FriendsModal
        visible={friendsOpen}
        onClose={() => setFriendsOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerActions: {flexDirection: 'row', gap: spacing.sm},
  intro: {paddingHorizontal: spacing.xl, gap: spacing.xs},
  filters: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  section: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  list: {gap: spacing.md},
  loading: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  notice: {
    marginHorizontal: spacing.xl,
    padding: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.goldChipBg,
    borderWidth: 1,
    borderColor: colors.goldChipBorder,
    gap: 2,
  },
  noticeText: {fontFamily: fonts.medium, fontSize: 13, color: colors.goldText},
  noticeAction: {fontFamily: fonts.bold, fontSize: 12, color: colors.goldText},
  empty: {paddingVertical: spacing.lg},
});
