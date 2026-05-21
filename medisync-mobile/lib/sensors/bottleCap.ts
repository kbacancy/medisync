import { Accelerometer } from 'expo-sensors';
import * as SecureStore from 'expo-secure-store';

const BASELINE_KEY = 'bottle_cap_baseline';
const THRESHOLD = 2.5;
const DEBOUNCE_MS = 2000;

let subscription: ReturnType<typeof Accelerometer.addListener> | null = null;
let lastDetectionTime = 0;
let baseline = { x: 0, y: 0, z: 1 };

function magnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

export async function isSensorAvailable(): Promise<boolean> {
  return Accelerometer.isAvailableAsync();
}

export async function calibrateBaseline(): Promise<void> {
  const available = await isSensorAvailable();
  if (!available) return;

  return new Promise((resolve) => {
    const readings: { x: number; y: number; z: number }[] = [];
    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      readings.push({ x, y, z });
      if (readings.length >= 10) {
        sub.remove();
        baseline = {
          x: readings.reduce((s, r) => s + r.x, 0) / readings.length,
          y: readings.reduce((s, r) => s + r.y, 0) / readings.length,
          z: readings.reduce((s, r) => s + r.z, 0) / readings.length,
        };
        SecureStore.setItemAsync(
          BASELINE_KEY,
          JSON.stringify(baseline)
        ).then(() => resolve());
      }
    });
  });
}

async function loadBaseline(): Promise<void> {
  try {
    const stored = await SecureStore.getItemAsync(BASELINE_KEY);
    if (stored) {
      baseline = JSON.parse(stored);
    }
  } catch {
    // use default
  }
}

export function startBottleCapListener(
  onBottleOpened: (prescriptionId?: string) => void
): void {
  loadBaseline().then(() => {
    if (subscription) return;

    Accelerometer.setUpdateInterval(200);
    subscription = Accelerometer.addListener(({ x, y, z }) => {
      const delta = magnitude(
        x - baseline.x,
        y - baseline.y,
        z - baseline.z
      );

      if (delta > THRESHOLD) {
        const now = Date.now();
        if (now - lastDetectionTime > DEBOUNCE_MS) {
          lastDetectionTime = now;
          onBottleOpened(undefined);
        }
      }
    });
  });
}

export function stopBottleCapListener(): void {
  if (subscription) {
    subscription.remove();
    subscription = null;
  }
}
