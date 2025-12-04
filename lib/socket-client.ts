import { io, Socket } from 'socket.io-client'

const SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://rentify-server-ge0f.onrender.com'

let socket: Socket | null = null
let currentToken: string | null = null

export function createSocket(token?: string) {
  // Reuse existing socket if token unchanged
  if (socket && token === currentToken) return socket

  if (socket) {
    try { socket.disconnect() } catch (e) { /* ignore */ }
    socket = null
  }

  currentToken = token || null

  socket = io(SERVER_URL, {
    transports: ['websocket'],
    auth: { token: token || null },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 60000,
    randomizationFactor: 0.5,
    autoConnect: true,
  })

  socket.on('connect_error', (err) => {
    console.error('Socket connect_error', err?.message || err)
  })

  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    try { socket.disconnect() } catch (e) { /* ignore */ }
    socket = null
    currentToken = null
  }
}

export default {
  createSocket,
  getSocket,
  disconnectSocket,
}
