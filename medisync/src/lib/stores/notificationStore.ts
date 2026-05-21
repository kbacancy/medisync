import { create } from 'zustand'
import type { CareAlert } from '@/types'

interface NotificationStore {
  unreadCount: number
  alerts: CareAlert[]
  addAlert: (alert: CareAlert) => void
  markAllRead: () => void
  incrementUnread: () => void
  resetUnread: () => void
}

export const useNotificationStore = create<NotificationStore>()((set) => ({
  unreadCount: 0,
  alerts: [],

  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts].slice(0, 50),
      unreadCount: state.unreadCount + 1,
    })),

  markAllRead: () =>
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, is_read: true })),
      unreadCount: 0,
    })),

  incrementUnread: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),

  resetUnread: () => set({ unreadCount: 0 }),
}))
