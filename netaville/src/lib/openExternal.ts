import {Alert} from 'react-native';
import * as Linking from 'expo-linking';

/**
 * Hands a URL to the OS, and tells the user when nothing can take it.
 *
 * `openURL` rejects when no app is registered for the URL — a simulator with
 * no Mail app, a device with no mail account. Left unhandled that surfaced as
 * a red unhandled-rejection toast in dev and a dead tap in release, so every
 * caller goes through here instead.
 *
 * Deliberately no `canOpenURL` pre-check: on iOS it rejects for any scheme
 * missing from LSApplicationQueriesSchemes, so it would report "no mail app"
 * on a phone that has one. Attempting the open is the honest test.
 *
 * `fallback` is what the user still needs when the handoff fails: the address
 * they meant to write to, the place they meant to navigate to.
 */
export async function openExternal(
  url: string,
  fallback: {title: string; message: string},
): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(fallback.title, fallback.message);
  }
}
