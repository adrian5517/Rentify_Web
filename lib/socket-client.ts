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
    // Prefer websocket first; if that fails the client may fallback to polling.
    // Some servers or proxies reject polling requests (400). Preferring websocket
    // avoids immediately triggering polling-related 400s in those environments.
    transports: ['websocket', 'polling'],
    // Pass token via auth for handshake-based auth on server
    auth: { token: token || null },
    // Keep reconnection enabled with backoff
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 60000,
    randomizationFactor: 0.5,
    // Increase the connect timeout (ms) so slow networks don't immediately timeout
    timeout: 20000,
    autoConnect: true,
  })

  socket.on('connect_error', (err) => {
    // Friendly logging: avoid noisy stack traces in the console while keeping useful info.
    const msg = err?.message || String(err)
    console.warn('Socket connect_error:', msg)
    // Dispatch a DOM event so UI code can show a user-friendly toast/notification if desired
    try {
      const ev = new CustomEvent('rentify:socketError', { detail: { message: msg } })
      window.dispatchEvent(ev)
    } catch (e) {
      // ignore (non-browser environments)
    }
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
