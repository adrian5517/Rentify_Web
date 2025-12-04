# Socket.IO Backend Integration Guide

This document describes a best-practice integration for Socket.IO on the server to work with the client-side pattern implemented in this repo: a persistent Socket.IO client that provides an `auth` token at handshake time. It covers secure authentication, connection lifecycle, private messaging patterns, scaling, and an optional multi-tab approach.

---

## Goals

- Authenticate sockets at handshake using a bearer/JWT token.
- Attach the authenticated user to `socket.data` for easy access.
- Provide a simple private-message pattern (room per user or mapping userId -> sockets).
- Support reconnection, exponential backoff, and reasonable timeouts.
- Provide notes on horizontal scaling (Redis adapter) and multi-tab single-connection strategies.

---

## Recommended Server Dependencies

- `express` (or your preferred HTTP framework)
- `http` (Node built-in)
- `socket.io` (server)
- `jsonwebtoken` (or your project's token library)
- `ioredis` + `socket.io-redis` or `@socket.io/redis-adapter` for scaling

Install example (npm):

```powershell
npm install express socket.io jsonwebtoken
npm install @socket.io/redis-adapter ioredis  # only if scaling across nodes
```

---

## Handshake Authentication (Recommended)

Use the `auth` handshake field on the client. The client code in this repo sets the token on socket creation like:

```ts
// client: new Socket(url, { auth: { token: 'Bearer <jwt>' } })
```

On the server, verify the token in a middleware using `io.use(async (socket, next) => { ... })`.

Node/Express + Socket.IO example:

```js
const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: { origin: 'https://your-frontend.example.com' },
  // optional: transports: ['websocket'] to avoid long-polling if desired
})

// Auth middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Authentication error'))

    // If your client prefixes with 'Bearer ', strip it
    const raw = token.startsWith('Bearer ') ? token.slice(7) : token

    const payload = jwt.verify(raw, process.env.JWT_SECRET)
    // Attach minimal user info to socket.data for handlers
    socket.data.user = { id: payload.sub || payload.id, email: payload.email }
    return next()
  } catch (err) {
    return next(new Error('Authentication error'))
  }
})

io.on('connection', (socket) => {
  const user = socket.data.user
  console.log('socket connected for user', user.id)

  // Option A: Join a room named after the user id (simple and common)
  socket.join(`user:${user.id}`)

  // Example: receive private messages from a client and forward to recipient
  socket.on('private-message', async (payload, ack) => {
    // payload: { to: '<recipientUserId>', text: 'hi', ... }
    try {
      // Persist message to DB here (author = user.id)
      const saved = await saveMessageToDb({ from: user.id, ...payload })

      // Emit to recipient room
      io.to(`user:${payload.to}`).emit('private-message', saved)

      // Optionally also ack sender success
      if (typeof ack === 'function') ack({ ok: true, id: saved.id })
    } catch (err) {
      if (typeof ack === 'function') ack({ ok: false })
    }
  })

  // Clean up on disconnect
  socket.on('disconnect', (reason) => {
    console.log('socket disconnected', user.id, reason)
  })
})

server.listen(3000)
```

Notes:
- Use `socket.data` to store per-socket authenticated user info (socket.data is typed in modern Socket.IO).
- Use `io.to('user:<id>').emit(...)` to deliver messages to all sockets for a user (handles multi-device automatically).

---

## Handling Cases When Handshake Auth Is Not Available

If your environment cannot set `auth` at handshake time (older clients, proxies, or constraints), you can allow the client to connect unauthenticated and then emit a `register` event immediately after connecting with the token (less secure because handshake-level auth is preferable):

```js
io.on('connection', (socket) => {
  socket.on('register', async ({ token }) => {
    // verify token, attach socket.data.user, then join room
  })
})
```

Prefer the handshake `auth` method whenever possible.

---

## Recommended Connection Config (Server & Client)

- Set reasonable ping/pong timeouts to detect stale connections (defaults are usually fine).
- Encourage clients to use reconnection with exponential backoff. Server-side, don't aggressively kick reconnecting clients.
- Use TLS/HTTPS in production.
- If you expect large binary payloads or file uploads consider using REST upload endpoints rather than socket binary frames.

Example Socket.IO server options you may tune:

```js
const io = new Server(server, {
  pingInterval: 25000,
  pingTimeout: 60000,
  cookie: false,
  maxHttpBufferSize: 1e6, // control maximum payload size
})
```

---

## Scaling Horizontally (Multiple Node Processes)

When running multiple Node instances, use the Redis adapter so messages emitted to a room propagate across nodes.

```js
const { createClient } = require('ioredis')
const { createAdapter } = require('@socket.io/redis-adapter')

const pubClient = createClient({ host: 'redis-host', port: 6379 })
const subClient = pubClient.duplicate()
io.adapter(createAdapter(pubClient, subClient))
```

Also ensure session validation is fast (JWT verification or cache lookups) so `io.use` doesn't slow down the handshake.

---

## Multi-Tab Considerations (Single-Connection per Browser)

Browsers open multiple tabs that may each create independent socket connections. This can be fine, but if you want a single shared connection per browser (fewer server resources, simpler presence state), consider one of these options:

- Use a SharedWorker (complex and not supported in all browsers).
- Use the BroadcastChannel API to elect a leader tab (the leader holds the socket). Other tabs communicate with leader via BroadcastChannel messages to request sends or receive messages.

High-level BroadcastChannel leader election approach:

1. Each tab opens `new BroadcastChannel('rentify-socket')`.
2. On startup, a tab sends a "who-is-leader" message and waits briefly for a leader response.
3. If none responds, the tab becomes leader and opens the socket.
4. Non-leaders relay outgoing message events to leader; leader emits and broadcasts incoming events back to other tabs.

This keeps a single socket connection per browser while preserving cross-tab UX. It's optional — many apps accept multiple sockets.

---

## Security Checklist

- Always verify the token signature and expiration in the `io.use` middleware.
- Don't store sensitive tokens in plain text logs.
- Use `socket.data` for ephemeral user attachment (avoid storing full tokens there).
- Ensure HTTPS/TLS in production.

---

## Helpful Server Event Names & Contract

- Client -> Server:
  - `private-message` payload: { to: string, text?: string, imageUrls?: string[], tempId?: string }
  - `typing-start` / `typing-stop` payload: { to: string }

- Server -> Client:
  - `private-message` payload: saved message object (include sender, receiver, timestamps, id)
  - `typing-start` / `typing-stop` payload: { senderId }

Design the payload to include an ID and timestamp from the server so clients can reconcile optimistic messages.

---

## Troubleshooting & Testing

- If clients report authentication errors on connect, verify whether the token is sent under `socket.handshake.auth.token` on the server.
- Use a minimal local test client that calls `io(url, { auth: { token } })` and logs `connect_error` events.
- Inspect server logs for `connection` and `disconnect` events and verify user IDs are attached to `socket.data.user`.

---

## Example: Acknowledge pattern (client->server->ack)

On the client you can send a message with an acknowledgement callback:

```js
socket.emit('private-message', { to, text }, (ack) => {
  if (ack?.ok) {
    // update optimistic message with ack.id or mark sent
  }
})
```

Server side ensure you call the ack once persisted:

```js
socket.on('private-message', async (payload, ack) => {
  const saved = await saveMessage(payload)
  if (ack) ack({ ok: true, id: saved.id })
})
```

---

## Next Steps for the Rentify Backend

- Confirm how your frontend socket client sends the token: handshake `auth.token` (recommended) or `register` event.
- Add an `io.use` middleware to verify the token and attach user info to `socket.data`.
- Use `io.to('user:<id>').emit()` to deliver messages to a user-specific room.
- Add Redis adapter when you run multiple Node instances.

If you'd like, I can add a ready-to-run `examples/socket-server.js` file to this repo that matches your auth/token scheme. Ask me to scaffold it and I will.
