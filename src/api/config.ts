import {Platform} from 'react-native';

/**
 * Base URL of the Netaville backend.
 *
 * On Android emulators `localhost` points at the emulator itself, so the host
 * machine is reachable at 10.0.2.2 instead.
 */
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const API_BASE_URL = __DEV__
  ? `http://${DEV_HOST}:8080/api`
  : 'https://api.netaville.example/api';

export const REQUEST_TIMEOUT_MS = 15_000;
