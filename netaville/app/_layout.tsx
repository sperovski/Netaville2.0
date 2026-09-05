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
import {AuthProvider, useAuth} from '@/context/auth';
import {bootstrapApp} from '@/context/bootstrap';
import {LoyaltyProvider} from '@/context/loyalty';
import {RsvpProvider} from '@/context/rsvp';
import {colors} from '@/theme';

// Rejects if the splash is already gone, which is not worth crashing over.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RsvpProvider>
          <LoyaltyProvider>
            <AppShell />
          </LoyaltyProvider>
        </RsvpProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const {status} = useAuth();
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
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // Booted either way: cold-start work that fails must not strand the app
    // on the intro screen forever.
    bootstrapApp()
      .catch(() => {})
      .finally(() => setBooted(true));
  }, []);

  const onIntroComplete = useCallback(() => setIntroDone(true), []);

  // Nothing renders until Montserrat is available, so no text ever flashes in
  // the system font.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  // The intro holds the screen until the animation, the cold-start work and
  // the stored-session lookup are all done — so a returning user never sees
  // the sign-in screen flash past.
  const restoring = status === 'restoring';
  const showSplash = !introDone || !booted || restoring;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {backgroundColor: colors.bg},
        }}>
        <Stack.Protected guard={status === 'signedIn'}>
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
          <Stack.Screen
            name="avatar"
            options={{presentation: 'modal', animation: 'slide_from_bottom'}}
          />
        </Stack.Protected>
        <Stack.Protected guard={status === 'signedOut'}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
      {showSplash ? (
        <NetavilleSplash
          onComplete={onIntroComplete}
          holding={!booted || restoring}
        />
      ) : null}
    </>
  );
}
