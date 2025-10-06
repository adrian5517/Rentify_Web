# 🔧 Troubleshooting WebSocket Connection

## Step-by-Step Guide to See Socket Connection Logs

### ✅ Step 1: Open Your App
Open your browser and go to:
- **http://localhost:3000** (or port 3001 if shown in terminal)

### ✅ Step 2: Open Browser Console FIRST
**IMPORTANT: Do this BEFORE navigating to Messages**

1. Press `F12` (or `Ctrl+Shift+J` on Windows)
2. Click the **Console** tab
3. Make sure you can see the console output area

### ✅ Step 3: Check if You're Logged In

In the console, type:
```javascript
localStorage.getItem('rentify_auth')
```

**Expected Result:**
- If logged in: You'll see something like `{"id":"123","name":"John","email":"john@example.com"}`
- If NOT logged in: You'll see `null`

**If you see `null`, you need to log in first:**
1. Click "Login" button in the navbar
2. Enter your credentials
3. After login, check localStorage again

### ✅ Step 4: Navigate to Messages Page

Now click the **"Messages"** button in the top navbar.

**What to Look For in Console:**

You should see these logs appear **immediately**:
```
🔵 MessagesPage component mounted
🔍 Auth data from localStorage: {"id":"...","name":"...","email":"..."}
👤 Current user: {id: "...", name: "...", email: "..."}
🚀 Initializing socket with user ID: ...
✅ Socket connected successfully!
📡 Socket ID: abc123xyz...
👤 Registering user: 67890...
```

### ✅ Step 5: Check Visual Indicators

In the Messages page UI, you should see:
- **Top of page**: Green banner "✓ Connected to real-time messaging"
- **Inside message box**: Green text "✓ Connected to Server"

---

## 🐛 Troubleshooting Common Issues

### Issue 1: "No user data found in localStorage"

**Console shows:**
```
⚠️ No user data found in localStorage - user not logged in
```

**Solution:**
1. Click "Login" in the navbar
2. Enter your credentials and log in
3. After successful login, navigate to Messages again

---

### Issue 2: Socket doesn't connect (no logs appear)

**Possible causes:**

#### A. Server is down or unreachable
Test the server:
1. Open new browser tab
2. Go to: https://rentify-server-ge0f.onrender.com
3. Wait 30 seconds (server might be sleeping)
4. Should see some response (even an error page is OK)

#### B. CORS or network issues
Check console for errors like:
- `CORS policy blocked`
- `ERR_CONNECTION_REFUSED`
- `WebSocket connection failed`

**Solution:**
- Check your internet connection
- Try disabling browser extensions
- Try incognito mode

#### C. Invalid user ID
Check if the user ID is valid:
```javascript
const auth = JSON.parse(localStorage.getItem('rentify_auth'))
console.log('User ID:', auth.id)
console.log('User ID type:', typeof auth.id)
```

The ID should be a string (MongoDB ObjectId format).

---

### Issue 3: Messages page doesn't load

**Console shows errors:**

Look for errors like:
- `Cannot read property 'id' of null`
- `user is undefined`
- Component error messages

**Solution:**
1. Make sure you're logged in
2. Check if auth data exists in localStorage
3. Refresh the page (`Ctrl+R`)
4. Clear cache (`Ctrl+Shift+R`)

---

### Issue 4: "[HMR] connected" but no socket logs

This is the most common issue!

**Understanding:**
- `[HMR] connected` = Next.js Hot Module Replacement (always shows)
- Socket logs = Only show when you navigate to **Messages page**

**The socket ONLY connects when:**
1. You are logged in ✅
2. You navigate to the Messages page ✅
3. The MessagesPage component mounts ✅

**Not when:**
- ❌ You're on the home page
- ❌ You're on any other page
- ❌ App first loads

---

## 📊 Expected Log Flow

Here's what you should see in order:

### 1. App Loads (Home Page)
```
[HMR] connected    ← This is just Next.js, not your socket
```

### 2. Navigate to Messages Page
```
🔵 MessagesPage component mounted
🔍 Auth data from localStorage: {"id":"67890","name":"John"}
👤 Current user: {id: "67890", name: "John", email: "john@example.com"}
🚀 Initializing socket with user ID: 67890
```

### 3. Socket Connects to Server
```
✅ Socket connected successfully!
📡 Socket ID: abc123xyz...
👤 Registering user: 67890
```

### 4. Socket Events (optional)
```
📩 Received new message: {...}  ← When someone sends you a message
🔄 Reconnection attempt # 1     ← If connection drops
```

### 5. Leave Messages Page
```
🔴 MessagesPage unmounting - disconnecting socket
```

---

## 🎯 Quick Checklist

Before testing, verify ALL of these:

- [ ] Dev server is running (`npm run dev`)
- [ ] Browser is open to http://localhost:3000
- [ ] Browser console is open (`F12` → Console tab)
- [ ] You are logged in (check localStorage)
- [ ] You clicked "Messages" in navbar
- [ ] You can see the Messages page UI
- [ ] Console is not filtered (should show all logs)

---

## 🧪 Manual Test

Copy and paste this in the browser console **after navigating to Messages**:

```javascript
// Check if logged in
const auth = localStorage.getItem('rentify_auth')
console.log('1. Auth data:', auth)

// Check if socket exists
const socket = window.__socket || null
console.log('2. Socket instance:', socket)

// Check connection status
if (socket) {
  console.log('3. Socket connected:', socket.connected)
  console.log('4. Socket ID:', socket.id)
} else {
  console.log('3. Socket not initialized yet')
}
```

---

## 🔍 Debug Mode

Want to see EVERYTHING that's happening? Add this to your browser console:

```javascript
// See all localStorage
console.table(localStorage)

// Monitor socket events
if (window.io) {
  console.log('Socket.IO client loaded:', true)
} else {
  console.log('Socket.IO client loaded:', false)
}
```

---

## 💡 Pro Tips

1. **Keep console open** - Always have the console visible when testing
2. **Clear console** - Click the 🚫 icon to clear old logs before testing
3. **Check network tab** - Go to Network → WS to see WebSocket connections
4. **Test with real user** - Make sure you sign up and log in with a real account
5. **Wait for server** - Render.com servers can take 30+ seconds to wake up

---

## 🆘 Still Not Working?

### Quick Checks:

1. **Are you on the Messages page?**
   - URL should be: http://localhost:3000 with "Messages" highlighted in navbar

2. **Is the server running?**
   - Open: https://rentify-server-ge0f.onrender.com
   - Should respond (might take 30s)

3. **Any red errors in console?**
   - Look for error messages
   - Screenshot and share the error

4. **Is localStorage populated?**
   ```javascript
   console.log(localStorage.getItem('rentify_auth'))
   ```
   Should show user data, not `null`

### Last Resort:

1. **Hard refresh**: `Ctrl+Shift+R`
2. **Clear browser cache**: Settings → Clear browsing data
3. **Try incognito mode**: `Ctrl+Shift+N`
4. **Restart dev server**: Stop (`Ctrl+C`) and run `npm run dev` again
5. **Check for port conflicts**: Make sure port 3000 or 3001 isn't blocked

---

## 📞 Need More Help?

If you're still not seeing the logs, provide these details:

1. **Browser console screenshot** (with all logs visible)
2. **What page you're on** (home or messages?)
3. **Are you logged in?** (check localStorage)
4. **Any error messages?** (red text in console)
5. **Server response** (from https://rentify-server-ge0f.onrender.com)

---

**Remember:** The socket logs will ONLY appear when you:
1. Are logged in ✅
2. Navigate to Messages page ✅
3. Have the console open ✅

Happy debugging! 🎉
