"use client"

import React from 'react'
import SocketProvider from '@/components/SocketProvider'
import NotificationList from '@/components/notification-list'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <NotificationList />
      {children}
    </SocketProvider>
  )
}