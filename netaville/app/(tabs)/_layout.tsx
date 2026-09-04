import {Tabs} from 'expo-router';
import {User} from 'lucide-react-native';
import {AppIcon} from '@/components/AppIcon';
import {colors, fonts, hairline, icon} from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandBlue,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopWidth: hairline,
          borderTopColor: colors.border,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.semibold,
          fontSize: 10.5,
          letterSpacing: 0.1,
        },
        tabBarItemStyle: {paddingTop: 6},
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Events',
          tabBarIcon: ({color}) => (
            <AppIcon name="events" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({color}) => (
            <AppIcon name="menu" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="card"
        options={{
          title: 'Card',
          tabBarIcon: ({color}) => (
            <AppIcon name="card" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ranks"
        options={{
          title: 'Ranks',
          tabBarIcon: ({color}) => (
            <AppIcon name="ranks" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({color}) => (
            <User size={21} strokeWidth={icon.strokeWidth} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
