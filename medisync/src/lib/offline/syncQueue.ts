import Dexie, { type Table } from 'dexie'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ActionType =
  | 'log-dose'
  | 'skip-dose'
  | 'snooze-dose'
  | 'request-refill'
  | 'send-message'

export interface QueuedAction {
  id?: number           // auto-incremented by Dexie
  type: ActionType
  payload: object
  timestamp: string
  retryCount: number
  retryAfter: string | null  // ISO string — null means ready immediately
}

// ─── Database ────────────────────────────────────────────────────────────────

class SyncQueueDb extends Dexie {
  actions!: Table<QueuedAction>

  constructor() {
    super('medisync_sync_queue')
    this.version(1).stores({
      // ++id = auto-increment primary key; rest are indexed for filtering
      actions: '++id, type, retryAfter',
    })
  }
}

// Client-only singleton — never instantiated during SSR
let _db: SyncQueueDb | null = null

function getDb(): SyncQueueDb {
  if (typeof window === 'undefined') throw new Error('IndexedDB is client-only')
  if (!_db) _db = new SyncQueueDb()
  return _db
}

// ─── Endpoint map ────────────────────────────────────────────────────────────

const ENDPOINT: Record<ActionType, string> = {
  'log-dose':       '/api/v1/adherence/log-dose',
  'skip-dose':      '/api/v1/adherence/log-dose',
  'snooze-dose':    '/api/v1/adherence/log-dose',
  'request-refill': '/api/pharmacy/dispense',
  'send-message':   '/api/messages',
}

// ─── One-time localStorage migration ─────────────────────────────────────────

const LEGACY_KEY = 'medisync_offline_queue'

async function migrateFromLocalStorage(): Promise<void> {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return
    const legacy = JSON.parse(raw) as Array<{
      id: string
      type: string
      payload: object
      timestamp: string
      synced: boolean
    }>
    const pending = legacy.filter((a) => !a.synced)
    if (pending.length > 0) {
      await getDb().actions.bulkAdd(
        pending.map((a) => ({
          type: a.type as ActionType,
          payload: a.payload,
          timestamp: a.timestamp,
          retryCount: 0,
          retryAfter: null,
        }))
      )
    }
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    // Migration is best-effort — never block the caller
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Queue an action for later sync.
 * Intentionally fire-and-forget so callers don't need to await it.
 */
export function queueAction(
  action: Pick<QueuedAction, 'type' | 'payload' | 'timestamp'>
): void {
  try {
    getDb()
      .actions.add({ ...action, retryCount: 0, retryAfter: null })
      .catch((err) => console.warn('[syncQueue] queue failed:', err))
  } catch {
    // SSR context — silently skip
  }
}

/**
 * Count of actions that are ready to sync right now (retryAfter has passed).
 */
export async function getPendingCount(): Promise<number> {
  try {
    const now = new Date().toISOString()
    return getDb()
      .actions.filter((a) => a.retryAfter === null || a.retryAfter <= now)
      .count()
  } catch {
    return 0
  }
}

/**
 * Attempt to flush all ready actions to the server.
 * Uses exponential backoff (max 30 min) for failed actions.
 * Automatically migrates any legacy localStorage entries on first call.
 */
export async function syncAll(): Promise<{ synced: number; failed: number }> {
  await migrateFromLocalStorage()

  let synced = 0
  let failed = 0

  try {
    const now = new Date().toISOString()
    const db = getDb()
    const pending = await db.actions
      .filter((a) => a.retryAfter === null || a.retryAfter <= now)
      .toArray()

    for (const action of pending) {
      try {
        const res = await fetch(ENDPOINT[action.type], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.payload),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        await db.actions.delete(action.id!)
        synced++
      } catch {
        const retryCount = action.retryCount + 1
        // 2s → 4s → 8s … capped at 30 min
        const backoffMs = Math.min(2_000 * 2 ** retryCount, 30 * 60 * 1_000)
        const retryAfter = new Date(Date.now() + backoffMs).toISOString()
        await db.actions.update(action.id!, { retryCount, retryAfter })
        failed++
      }
    }
  } catch (err) {
    console.warn('[syncQueue] syncAll error:', err)
  }

  if (failed > 0) {
    console.warn(`[syncQueue] ${failed} action(s) failed — will retry with backoff`)
  }

  return { synced, failed }
}
