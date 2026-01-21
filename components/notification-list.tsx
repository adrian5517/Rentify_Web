"use client"

import React from 'react'
import { useNotificationStore } from '@/lib/notification-store'

export default function NotificationList() {
  const { notifications, removeNotification } = useNotificationStore()

  if (notifications.length === 0) return null

  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
      {notifications.map((n) => (
        <div key={n.id} style={{
          background: n.type === 'success' ? '#10b981' : n.type === 'error' ? '#ef4444' : n.type === 'warning' ? '#f59e0b' : '#3b82f6',
          color: '#fff',
          padding: '10px 15px',
          borderRadius: 8,
          marginBottom: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: 300
        }}>
          <span>{n.message}</span>
          <button onClick={() => removeNotification(n.id)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 18, marginLeft: 10 }}>×</button>
        </div>
      ))}
    </div>
  )
}