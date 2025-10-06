# How to Check WebSocket Connection Status

## 🎯 Quick Check Methods

### 1. **Visual Indicators in Your App** (Easiest)

Your app has built-in connection indicators:

#### A. At the top of Messages page:
- 🟡 **Yellow banner**: "Connecting to server..." (with pulsing dot)
- 🟢 **Green banner**: "✓ Connected to real-time messaging"

#### B. Inside the message box (at the top):
- 🟡 **Yellow**: "Connection to Server..." (connecting)
- 🟢 **Green**: "✓ Connected to Server" (connected)

---

### 2. **Browser Developer Console** (Most Detailed)

#### How to Open Console:
- **Chrome/Edge**: Press `F12` or `Ctrl+Shift+J`
- **Firefox**: Press `F12` or `Ctrl+Shift+K`
- Click the **Console** tab

#### What to Look For:

**✅ Successful Connection:**
```
✅ Socket connected successfully!
📡 Socket ID: abc123xyz...
👤 Registering user: 67890...
```

**❌ Connection Error:**
```
❌ Socket connection error: <error message>
🔍 Full error: <detailed error>
```

**🔄 Reconnecting:**
```
🔄 Reconnection attempt # 1
🔄 Socket reconnected after 2 attempts
```

**❌ Disconnected:**
```
❌ Socket disconnected
🔍 Reason: transport close / io server disconnect / etc.
```

---

### 3. **Browser Network Tab**

#### Steps:
1. Open Developer Tools (`F12`)
2. Click **Network** tab
3. Filter by **WS** (WebSocket)
4. Look for connection to: `wss://rentify-server-ge0f.onrender.com`

#### What to Look For:
- **Status 101**: WebSocket connection established ✅
- **Green indicator**: Connection is active
- **Messages flowing**: Click the connection to see real-time messages

---

### 4. **Programmatic Check** (For Developers)

You can check connection status in your code:

```typescript
import { getSocket } from '@/lib/socket';

const socket = getSocket();

// Check if socket exists and is connected
if (socket && socket.connected) {
  console.log('✅ Connected!');
  console.log('Socket ID:', socket.id);
} else {
  console.log('❌ Not connected');
}
```

---

## 🔍 Connection Status Properties

The socket object has these useful properties:

```typescript
socket.connected    // true/false - Is currently connected?
socket.disconnected // true/false - Is currently disconnected?
socket.id           // string - Unique socket ID (when connected)
socket.active       // true/false - Is connection active?
```

---

## 🐛 Troubleshooting Connection Issues

### Issue: "Connection to Server..." stays yellow

**Possible Causes:**
1. **Server is down**
   - Check: https://rentify-server-ge0f.onrender.com
   - It should respond (might take 30s if cold start)

2. **Network/Firewall blocking WebSocket**
   - Check browser console for errors
   - Try different network (mobile hotspot)

3. **User not logged in**
   - Check localStorage: `rentify_auth` should exist
   - Should contain: `{ id, name, email }`

4. **CORS issues**
   - Server must allow your domain
   - Check console for CORS errors

---

### Issue: Connects then immediately disconnects

**Possible Causes:**
1. **Invalid user ID**
   - Check console: "👤 Registering user: ..."
   - ID must be valid MongoDB ObjectId

2. **Server rejecting connection**
   - Check server logs
   - Verify JWT authentication (if enabled)

3. **Multiple tabs open**
   - Close other tabs with the app
   - Each tab creates separate connection

---

### Issue: Messages not appearing

**Even though connected:**
1. **Check if listening to correct event**
   - Event name: `'private-message'`
   - Check console for received messages

2. **Check sender/receiver IDs**
   - Must match MongoDB User IDs
   - Verify in database

3. **Check message format**
   - Must match MessageData interface
   - Required fields: sender, receiver, message/imageUrls

---

## 📊 Connection Flow

```
1. User opens Messages page
   ↓
2. Component mounts
   ↓
3. initializeSocket(userId) called
   ↓
4. Socket connects to server
   ↓
5. 'connect' event fires
   ↓
6. Console: "✅ Socket connected successfully!"
   ↓
7. socket.emit('register', userId)
   ↓
8. Console: "👤 Registering user: ..."
   ↓
9. UI: Green banner appears ✓
   ↓
10. Ready to send/receive messages!
```

---

## 🧪 Testing Connection

### Test 1: Check Console Logs
```javascript
// Open browser console and type:
console.log('Socket test');
```
You should see other socket logs if connection is working.

### Test 2: Manual Connection Check
```javascript
// In browser console, type:
const socket = window.__socket;
console.log('Connected:', socket?.connected);
console.log('Socket ID:', socket?.id);
```

### Test 3: Send Test Message
```javascript
// In browser console:
socket?.emit('private-message', {
  senderId: 'your-user-id',
  receiverId: 'other-user-id',
  message: 'Test message'
});
```

---

## 📝 Connection Lifecycle Events

Your socket listens to these events:

| Event | Meaning | When it fires |
|-------|---------|---------------|
| `connect` | Successfully connected | Initial connection or reconnection |
| `disconnect` | Connection lost | Network issue, server restart, manual disconnect |
| `connect_error` | Failed to connect | Server down, network issue, wrong URL |
| `reconnect` | Reconnected successfully | After temporary disconnect |
| `reconnect_attempt` | Trying to reconnect | During reconnection process |
| `reconnect_error` | Reconnection failed | Still trying to reconnect |
| `reconnect_failed` | All attempts failed | After 5 reconnection attempts |

---

## ⚙️ Connection Settings

Your socket configuration:
```typescript
{
  transports: ['websocket', 'polling'],  // Try WebSocket first, fallback to polling
  reconnection: true,                     // Auto-reconnect if disconnected
  reconnectionAttempts: 5,                // Try 5 times before giving up
  reconnectionDelay: 1000,                // Wait 1 second between attempts
}
```

---

## 🎯 Quick Verification Checklist

Before using the app, verify:

- [ ] Server is running: https://rentify-server-ge0f.onrender.com
- [ ] User is logged in (localStorage has 'rentify_auth')
- [ ] Browser console shows: "✅ Socket connected successfully!"
- [ ] UI shows green "Connected to Server" indicator
- [ ] No errors in browser console
- [ ] Network tab shows active WebSocket connection (WS)

---

## 💡 Pro Tips

1. **Keep console open** when testing to see all connection events
2. **Check Network tab** to see WebSocket messages in real-time
3. **Use green indicators** as quick visual confirmation
4. **Test with two users** in different browsers/devices
5. **Check server logs** if frontend shows connected but messages don't work

---

## 🆘 Still Having Issues?

1. **Check server status**: Visit https://rentify-server-ge0f.onrender.com
2. **Clear browser cache**: Hard reload with `Ctrl+Shift+R`
3. **Check localStorage**: Verify user data exists
4. **Try incognito mode**: Rule out extension conflicts
5. **Check backend logs**: Server might have error messages

---

**Server URL**: https://rentify-server-ge0f.onrender.com
**WebSocket URL**: wss://rentify-server-ge0f.onrender.com
**Socket.io Client Version**: 4.x
**Connection Timeout**: 20 seconds
**Reconnection Attempts**: 5 times
**Reconnection Delay**: 1 second

Your connection status is now fully transparent! 🎉
