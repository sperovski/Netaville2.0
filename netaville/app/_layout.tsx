import {useCallback, useEffect, useState} from 'react';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/montserrat';
import {NetavilleSplash} from '@/components/NetavilleSplash';
import {bootstrapApp} from '@/context/bootstrap';
import {LoyaltyProvider} from '@/context/loyalty';
import {RsvpProvider} from '@/context/rsvp';
import {colors} from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [booted, setBooted] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    void bootstrapApp().then(() => setBooted(true));
  }, []);

  const onIntroComplete = useCallback(() => setIntroDone(true), []);

  // Nothing renders until Montserrat is available, so no text ever flashes in
  // the system font.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  // The intro holds the screen until both the animation and the cold-start
  // work are done — whichever finishes last.
  const showSplash = !introDone || !booted;

  return (
    <SafeAreaProvider>
      <RsvpProvider>
        <LoyaltyProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {backgroundColor: colors.bg},
            }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="event/[id]" />
            <Stack.Screen name="about" />
            <Stack.Screen name="calendar" />
            <Stack.Screen name="friends" />
            <Stack.Screen name="notifications" />
            <Stack.Screen
              name="request-event"
              options={{presentation: 'modal', animation: 'slide_from_bottom'}}
            />
          </Stack>
          {showSplash ? (
            <NetavilleSplash onComplete={onIntroComplete} holding={!booted} />
          ) : null}
        </LoyaltyProvider>
      </RsvpProvider>
    </SafeAreaProvider>
  );
}
