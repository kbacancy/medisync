const QUEUE_KEY = 'medisync_offline_queue'

export interface QueuedAction {
  id: string
  type: 'log-dose' | 'skip-dose' | 'snooze-dose'
  payload: object
  timestamp: string
  synced: boolean
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function queueAction(
  action: Omit<QueuedAction, 'id' | 'synced'>
): void {
  const existing = getPendingActions()
  const entry: QueuedAction = { ...action, id: generateId(), synced: false }
  const updated = [...existing, entry]
  localStorage.setItem(QUEUE_KEY, JSON.stringify(updated))
}

export function getPendingActions(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    return (JSON.parse(raw) as QueuedAction[]).filter((a) => !a.synced)
  } catch {
    return []
  }
}

export function markSynced(id: string): void {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return
    const all = JSON.parse(raw) as QueuedAction[]
    const updated = all.map((a) => (a.id === id ? { ...a, synced: true } : a))
    localStorage.setItem(QUEUE_KEY, JSON.stringify(updated))
  } catch {
    // localStorage unavailable
  }
}

export async function syncAll(): Promise<void> {
  const pending = getPendingActions()
  if (pending.length === 0) return

  const results = await Promise.allSettled(
    pending.map(async (action) => {
      const res = await fetch('/api/v1/adherence/log-dose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      markSynced(action.id)
    })
  )

  // Prune synced entries after flush
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return
    const all = JSON.parse(raw) as QueuedAction[]
    const remaining = all.filter((a) => !a.synced)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
  } catch {
    // ignore
  }

  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    console.warn(`[syncQueue] ${failed} of ${pending.length} actions failed to sync`)
  }
}
