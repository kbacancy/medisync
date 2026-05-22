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
