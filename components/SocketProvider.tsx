"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createSocket, getSocket, disconnectSocket } from '@/lib/socket-client'
import { getAuthToken } from '@/lib/api'

type SocketContextValue = {
  socket: ReturnType<typeof getSocket> | null
  connected: boolean
}

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false })

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const token = getAuthToken() || null
    const s = createSocket(token || undefined)

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)

    if (s) {
      s.on('connect', onConnect)
      s.on('disconnect', onDisconnect)
      setConnected(Boolean(s.connected))
    }

    const handleVisibility = () => {
      // keep socket active but could reduce activity when hidden
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const onBeforeUnload = () => {
      try { if (s) s.emit('client:unload') } catch (e) { /* ignore */ }
    }
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      if (s) {
        try { s.off('connect', onConnect) } catch (e) { /* ignore */ }
        try { s.off('disconnect', onDisconnect) } catch (e) { /* ignore */ }
      }
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', onBeforeUnload)
      // Do not disconnect socket here so it survives client transitions if provider remains mounted
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket: getSocket(), connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocketContext = () => useContext(SocketContext)

export default SocketProvider
