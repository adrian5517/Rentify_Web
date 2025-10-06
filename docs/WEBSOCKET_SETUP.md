# WebSocket Real-Time Messaging Setup

## Overview
Your Rentify app now has real-time messaging capabilities using WebSocket (Socket.IO). Messages are sent and received instantly without page refreshes!

## Features Implemented

### ✅ Real-Time Messaging
- **Instant message delivery** via WebSocket
- **Online/Offline status** tracking
- **Connection status indicator** (green = connected, yellow = connecting)
- **Auto-scroll** to newest messages
- **Message reactions** (❤️, 👍, 😊, 😂)
- **Image support** (up to 5 images per message)
- **Message persistence** (stored in MongoDB)

### 🔧 Technical Implementation

#### 1. **Socket Connection** (`lib/socket.ts`)
- Manages WebSocket connection to server
- Auto-reconnect on disconnect
- User registration on connect
- Event listeners for real-time updates

#### 2. **API Integration** (`lib/api.ts`)
- `fetchMessages()` - Load message history
- `sendMessageAPI()` - Send messages with images (REST API)
- `deleteMessage()` - Delete messages
- `fetchUsers()` - Get list of users/contacts

#### 3. **MessagesPage Component** (`app/page.tsx`)
- Real-time message updates
- Text and image message support
- Online status indicators
- Loading states
- Message reactions
- Auto-scroll to latest message

## How It Works

### Message Flow

1. **Text Messages** (via WebSocket):
   ```
   User types → Click Send → Socket.emit('private-message') 
   → Server receives → Server emits to receiver 
   → Receiver gets real-time update
   ```

2. **Image Messages** (via REST API):
   ```
   User selects images → Click Send → POST /api/messages/send 
   → Images uploaded to Cloudinary → Message saved to MongoDB 
   → Both users can see images
   ```

### Connection Process

```
1. User logs in → Get user ID from localStorage
2. initializeSocket(userId) → Connect to WebSocket server
3. socket.emit('register', userId) → Register user with server
4. socket.on('private-message') → Listen for incoming messages
5. Messages appear instantly in UI
```

## Usage

### Sending Messages

**Text Only:**
- Type message in input box
- Click Send button or press Enter
- Message sent via WebSocket instantly

**With Images:**
- Click attachment icon (📎)
- Select 1-5 images
- Type optional message
- Click Send
- Images uploaded to Cloudinary and message sent via REST API

### Message Features

- **React to messages**: Hover over any message → Click emoji
- **Delete messages**: Use the API endpoint (can be added to UI)
- **Image preview**: Shows thumbnail before sending
- **Read status**: Messages track read/unread status (in database)

## Environment Variables Required

Make sure your server has these set:

```env
DB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
PORT=10000
```

## API Endpoints

### Messages
- `POST /api/messages/send` - Send message with optional images
- `GET /api/messages/:userId1/:otherUserId` - Get message history
- `DELETE /api/messages/:id` - Delete a message

### WebSocket Events
- `connection` - Client connects
- `register` - Client registers with user ID
- `private-message` - Send/receive messages
- `disconnect` - Client disconnects

## Data Structure

### Message Schema (MongoDB)
```javascript
{
  sender: ObjectId (User),
  receiver: ObjectId (User),
  message: String (optional),
  imageUrls: [String] (array of Cloudinary URLs),
  read: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

### Frontend Message Type
```typescript
type Message = {
  _id: string
  sender: string
  receiver: string
  message?: string
  imageUrls?: string[]
  read: boolean
  createdAt: string
  updatedAt: string
  fromMe?: boolean
  time?: string
  type?: 'text' | 'image'
  reactions?: { emoji: string; count: number }[]
}
```

## Troubleshooting

### Connection Issues

**Yellow indicator (Connecting...)**
- Check if server is running on https://rentify-server-ge0f.onrender.com
- Check browser console for WebSocket errors
- Verify user is logged in (has valid auth data in localStorage)

**No messages appearing**
- Check browser console for errors
- Verify MongoDB connection on server
- Check network tab for failed API calls
- Make sure user IDs are valid MongoDB ObjectIds

### Image Upload Issues

- Maximum 5 images per message
- Check Cloudinary credentials on server
- Ensure images are < 10MB each
- Check browser console for upload errors

## Next Steps / Improvements

### Recommended Enhancements:

1. **User List** - Add endpoint to fetch all users for contacts
2. **Typing Indicator** - Show "User is typing..." status
3. **Message Search** - Search through message history
4. **File Attachments** - Support PDFs, documents
5. **Voice Messages** - Record and send audio
6. **Message Threads** - Reply to specific messages
7. **Group Chats** - Support multiple participants
8. **Push Notifications** - Notify when app is closed
9. **Message Editing** - Edit sent messages
10. **Message Forwarding** - Forward messages to other users

### Security Improvements:

- Add JWT authentication to WebSocket connection
- Validate sender/receiver IDs on server
- Rate limiting for message sending
- Content moderation for messages/images
- End-to-end encryption (optional)

## Testing

### Test Message Flow:

1. Open app in two browser windows
2. Log in as different users in each
3. Send message from Window 1
4. Message should appear instantly in Window 2
5. Send reply from Window 2
6. Reply appears instantly in Window 1

### Test Image Upload:

1. Click attachment icon
2. Select image
3. See preview appear
4. Click Send
5. Wait for upload (loading indicator)
6. Image appears in chat for both users

## Support

For issues or questions:
1. Check browser console for errors
2. Check server logs for backend errors
3. Verify all environment variables are set
4. Test API endpoints directly with Postman
5. Check MongoDB for data persistence

## Connection Status Meanings

- 🟢 **Green**: Connected to real-time messaging (WebSocket active)
- 🟡 **Yellow**: Connecting to server (attempting connection)
- 🔴 **Red**: Disconnected (check server/network)

---

**Server API**: https://rentify-server-ge0f.onrender.com
**WebSocket**: wss://rentify-server-ge0f.onrender.com

Your real-time messaging is now fully integrated! 🎉
