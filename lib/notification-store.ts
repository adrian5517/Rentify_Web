"use client"

import { create } from 'zustand'

interface Notification {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
}

interface NotificationStore {
  notifications: Notification[]
  addNotification: (message: string, type?: Notification['type']) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (message, type = 'info') => {
    const id = Date.now().toString()
    set((state) => ({
      notifications: [...state.notifications, { id, message, type, timestamp: new Date() }]
    }))
    // Auto-remove after 5 seconds
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      }))
    }, 5000)
  },
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }))
  },
  clearNotifications: () => {
    set({ notifications: [] })
  }
}))