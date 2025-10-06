# Frontend-Backend Integration Guide

## ✅ Integration Complete

All frontend Socket.io events now match the backend implementation. The messaging system is fully integrated and ready to use!

---

## Socket.io Events Alignment

### 1. Typing Indicators

#### Frontend → Backend (Emit)
```typescript
// When user starts typing
socket.emit('typing-start', { senderId: userId, receiverId: partnerId })

// When user stops typing (500ms after last keystroke)
socket.emit('typing-stop', { senderId: userId, receiverId: partnerId })
```

#### Backend → Frontend (Listen)
```typescript
// Partner started typing
socket.on('typing-start', ({ senderId }) => {
  // Show "is typing..." indicator
})

// Partner stopped typing
socket.on('typing-stop', ({ senderId }) => {
  // Hide typing indicator
})
```

**Status**: ✅ Fully implemented with 500ms debouncing

---

### 2. Read Receipts

#### Frontend → Backend (Emit)
```typescript
// Mark all messages from other user as read
socket.emit('mark-as-read', { 
  userId: currentUserId, 
  otherUserId: chatPartnerId 
})
```

#### Backend → Frontend (Listen)
```typescript
// Notification that messages were read
socket.on('messages-read', ({ readBy, count }) => {
  // Update UI to show double checkmarks
  // count = number of messages marked as read
})
```

**Status**: ✅ Fully implemented with checkmark UI

---

### 3. Private Messages

#### Frontend ↔ Backend
```typescript
// Send message
socket.emit('private-message', {
  senderId: userId,
  receiverId: partnerId,
  text: 'Hello!',
  images: []
})

// Receive message
socket.on('private-message', (message) => {
  // Display new message in chat
})
```

**Status**: ✅ Already working

---

## File Changes Summary

### Updated Files

1. **`lib/socket.ts`** - Updated event names:
   - `typing` → `typing-start`
   - `stop-typing` → `typing-stop`
   - `mark-read` → `mark-as-read`
   - Renamed `markMessageAsRead()` → `markMessagesAsRead()`
   - Changed parameters to match backend expectations

2. **`app/page.tsx`** - Updated event listeners:
   - `user-typing` → `typing-start`
   - `user-stopped-typing` → `typing-stop`
   - `message-read` → `messages-read`
   - Updated payload destructuring to match backend
   - Changed read receipt logic to update all messages at once instead of per message

---

## Key Differences from Previous Implementation

| Feature | Old (Custom) | New (Backend) |
|---------|-------------|---------------|
| Typing start | `typing` | `typing-start` |
| Typing stop | `stop-typing` | `typing-stop` |
| Mark read | `mark-read` (per message) | `mark-as-read` (bulk) |
| Read notification | `message-read` (messageId) | `messages-read` (userId, count) |

---

## Testing Checklist

### ✅ Already Working
- [x] Socket.io connection
- [x] User registration with socket
- [x] Send/receive messages
- [x] Image upload
- [x] Message deletion
- [x] Connection status indicators

### 🧪 Ready to Test (Backend Now Available)
- [ ] **Typing Indicators**
  1. Open chat in Browser 1, start typing
  2. Verify "Typing..." appears in Browser 2 chat header
  3. Verify animated dots appear in Browser 2 contact list
  4. Stop typing for 500ms, verify indicator disappears
  
- [ ] **Read Receipts**
  1. Send message from Browser 1
  2. Verify single checkmark appears
  3. Open chat in Browser 2
  4. Verify double checkmark appears in Browser 1
  5. Verify all unread messages marked as read at once

- [ ] **User List with Search** (if backend implemented)
  1. Click search in contacts sidebar
  2. Type user name/email/username
  3. Verify filtered results appear
  4. Select user to start chat

---

## Usage Examples

### Complete Chat Flow

```typescript
// 1. Initialize connection (already done on page load)
const socket = initializeSocket(currentUser._id)

// 2. Select a contact to chat with
setSelectedContact(contactId) // Triggers message fetch and mark-as-read

// 3. Start typing
// (Automatically handled by input onChange)
// Emits: typing-start
// After 500ms idle: typing-stop

// 4. Send a message
handleSend() // Uses WebSocket for text, REST API for images

// 5. Receive typing indicators
// Automatically updates UI when partner types

// 6. Receive read receipts
// Automatically updates checkmarks when partner opens chat
```

---

## API Endpoints Available

### Backend Endpoints (from NEW_FEATURES.md)

1. **GET /api/auth/users**
   - Search/filter users
   - Query params: `search`, `role`, `limit`, `page`
   - Returns paginated user list

2. **POST /api/messages/mark-read**
   - HTTP alternative to Socket.io event
   - Body: `{ userId, otherUserId }`
   - Returns: `{ message, modifiedCount }`

### Frontend API Utilities (lib/api.ts)

```typescript
fetchUsers() // Get all users (uses backend endpoint)
fetchMessages(userId1, userId2) // Get message history
sendMessageAPI(sender, receiver, text, images) // Send with images
deleteMessage(messageId) // Delete a message
```

---

## Environment Setup

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://rentify-server-ge0f.onrender.com
```

### Backend (.env)
```env
DB_URI=mongodb://...
JWT_SECRET=your_secret
PORT=10000
```

---

## Debugging Tips

### Enable Verbose Logging

All Socket.io events include emoji indicators in console:

- 🚀 Socket initialization
- ✅ Connection successful
- 📡 Socket ID
- 👤 User registration
- 📩 Message received
- ⌨️ Typing indicator sent
- ✋ Stop typing
- ✓✓ Messages marked as read
- ❌ Errors

### Check Socket Connection
```typescript
const socket = getSocket()
console.log('Connected:', socket?.connected)
console.log('Socket ID:', socket?.id)
```

### Monitor Events (Browser DevTools)
1. Open Network tab
2. Filter by "WS" (WebSocket)
3. Click on WebSocket connection
4. View "Messages" tab to see real-time events

---

## Performance Considerations

### Typing Indicators
- ✅ Debounced to 500ms (prevents event spam)
- ✅ Automatically stops on send
- ✅ Clears timeout on component unmount

### Read Receipts
- ✅ Bulk marking (all messages at once)
- ✅ Only sent when opening chat
- ✅ Only marks unread messages

### Message Loading
- ✅ REST API for history (not Socket.io)
- ✅ Socket.io only for real-time updates
- ✅ Lazy loading with loading states

---

## Next Steps

### Immediate Testing
1. Start backend server: `node server.js`
2. Start frontend: `npm run dev`
3. Open 2 browsers with different test users
4. Test typing indicators and read receipts

### Optional Enhancements
- [ ] Online/offline status (backend already supports this)
- [ ] Last seen timestamps
- [ ] Unread message count per contact
- [ ] Message delivery status (sent → delivered → read)
- [ ] Group chat support
- [ ] Voice messages
- [ ] File attachments (non-image)

---

## Troubleshooting

### Typing indicator doesn't show
- Check console for `typing-start` event
- Verify socket is connected
- Check other user is in same chat
- Ensure 500ms hasn't passed (auto-stops)

### Read receipts not working
- Check console for `mark-as-read` emission
- Verify other user receives `messages-read`
- Check Message.read field in database
- Ensure chat is actually opened (not just selected)

### Socket disconnects frequently
- Check server CORS settings
- Verify WebSocket transport enabled
- Check for network/firewall issues
- Increase server timeout settings

---

## Support

**Documentation Files:**
- `docs/BACKEND_USERS_ENDPOINT.md` - Backend users API spec
- `docs/CREATE_TEST_USERS.md` - Test user creation guide
- `docs/REAL_TIME_FEATURES_IMPLEMENTATION.md` - Complete features guide
- `NEW_FEATURES.md` - Backend implementation details (this is what backend added)
- `FRONTEND_BACKEND_INTEGRATION.md` - This file

**Key Files:**
- `lib/socket.ts` - Socket.io connection & events
- `lib/api.ts` - REST API utilities
- `app/page.tsx` - Main chat UI (MessagesPage)

**All events log to console with emoji indicators for easy debugging!** 🚀
