import Constants from 'expo-constants';

/**
 * Returns the base URL for the Next.js web API.
 *
 * In development on a physical device, `localhost` is the device itself — the
 * dev server is unreachable. We derive the correct IP from Expo's metro host
 * URI so physical-device testing works without manually editing .env.
 */
export function getApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL ?? '';

  // Production / explicitly configured non-local URL — use it as-is
  if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
    return configured.replace(/\/$/, '');
  }

  // Dev on a physical device: derive machine IP from the metro bundler hostUri
  if (__DEV__) {
    // hostUri looks like "192.168.1.42:8081" (metro port)
    const hostUri =
      Constants.expoConfig?.hostUri ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Constants as any).manifest?.debuggerHost;
    if (hostUri) {
      const machineIp = hostUri.split(':')[0];
      return `http://${machineIp}:3000`;
    }
  }

  return configured || 'http://localhost:3000';
}
