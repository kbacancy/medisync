import { create } from 'zustand';
import { CareAlert } from '../types';

interface NotificationStore {
  unreadCount: number;
  alerts: CareAlert[];
  setAlerts: (alerts: CareAlert[]) => void;
  addAlert: (alert: CareAlert) => void;
  markAllRead: () => void;
  incrementUnread: () => void;
  resetUnread: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  unreadCount: 0,
  alerts: [],
  setAlerts: (alerts) =>
    set({
      alerts,
      unreadCount: alerts.filter((a) => !a.is_read).length,
    }),
  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts],
      unreadCount: !alert.is_read ? state.unreadCount + 1 : state.unreadCount,
    })),
  markAllRead: () =>
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, is_read: true })),
      unreadCount: 0,
    })),
  incrementUnread: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),
  resetUnread: () => set({ unreadCount: 0 }),
}));
