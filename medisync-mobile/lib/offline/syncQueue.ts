import * as SQLite from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { getApiUrl } from '../apiUrl';

function uuidv4(): string {
  return Crypto.randomUUID();
}

export interface QueuedAction {
  id: string;
  type: 'log-dose' | 'skip-dose' | 'snooze-dose' | 'request-refill';
  payload: string;
  timestamp: string;
  synced: number;
}

let db: SQLite.SQLiteDatabase | null = null;

export async function initSyncQueue(): Promise<void> {
  db = await SQLite.openDatabaseAsync('medisync_queue.db');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS queued_actions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);
}

function getDb(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('SyncQueue not initialised — call initSyncQueue() first');
  return db;
}

export async function queueAction(
  type: QueuedAction['type'],
  payload: object
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `INSERT INTO queued_actions (id, type, payload, timestamp, synced)
     VALUES (?, ?, ?, ?, 0)`,
    uuidv4(),
    type,
    JSON.stringify(payload),
    new Date().toISOString()
  );
}

export async function getPendingActions(): Promise<QueuedAction[]> {
  const database = getDb();
  return database.getAllAsync<QueuedAction>(
    `SELECT * FROM queued_actions WHERE synced = 0 ORDER BY timestamp ASC`
  );
}

export async function markSynced(id: string): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `UPDATE queued_actions SET synced = 1 WHERE id = ?`,
    id
  );
}

export async function syncAll(): Promise<{ synced: number; failed: number }> {
  const apiUrl = getApiUrl();
  const actions = await getPendingActions();
  let synced = 0;
  let failed = 0;

  for (const action of actions) {
    try {
      const payload = JSON.parse(action.payload);
      let endpoint = '';

      switch (action.type) {
        case 'log-dose':
        case 'skip-dose':
        case 'snooze-dose':
          endpoint = `${apiUrl}/api/v1/adherence/log-dose`;
          break;
        case 'request-refill':
          endpoint = `${apiUrl}/api/v1/pharmacy/dispense`;
          break;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, client_timestamp: action.timestamp }),
      });

      if (res.ok || res.status === 409) {
        await markSynced(action.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

export async function setupNetworkListener(): Promise<void> {
  let wasOffline = false;

  NetInfo.addEventListener((state) => {
    const isOnline = state.isConnected && state.isInternetReachable;
    if (wasOffline && isOnline) {
      syncAll().catch(console.error);
    }
    wasOffline = !isOnline;
  });
}
