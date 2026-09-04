import React from 'react';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useColorScheme} from 'react-native';
import {DetailsScreen} from '@/screens/DetailsScreen';
import {HomeScreen} from '@/screens/HomeScreen';
import {SettingsScreen} from '@/screens/SettingsScreen';
import type {HomeStackParamList, RootTabParamList} from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen name="Details" component={DetailsScreen} />
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  const isDark = useColorScheme() === 'dark';

  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      <Tab.Navigator screenOptions={{headerShown: false}}>
        <Tab.Screen
          name="HomeTab"
          component={HomeStack}
          options={{title: 'Home'}}
        />
        <Tab.Screen
          name="SettingsTab"
          component={SettingsScreen}
          options={{title: 'Settings'}}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
