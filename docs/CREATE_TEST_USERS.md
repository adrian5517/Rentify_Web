# Test Users Registration Helper

## Quick Test Users for Messaging

Use these credentials to create test users quickly for testing the messaging system.

---

## 🚀 Option 1: Use Your Signup Page

Visit your app's signup page and create users manually:

### Test User 1
- **Username:** `testuser1`
- **Email:** `test1@example.com`
- **Password:** `Test123!`
- **Name:** `John Santos`

### Test User 2
- **Username:** `testuser2`
- **Email:** `test2@example.com`
- **Password:** `Test123!`
- **Name:** `Maria Cruz`

### Test User 3
- **Username:** `testuser3`
- **Email:** `test3@example.com`
- **Password:** `Test123!`
- **Name:** `Robert Kim`

### Test User 4
- **Username:** `testuser4`
- **Email:** `test4@example.com`
- **Password:** `Test123!`
- **Name:** `Lisa Wong`

### Test User 5
- **Username:** `testuser5`
- **Email:** `test5@example.com`
- **Password:** `Test123!`
- **Name:** `Michael Chen`

---

## 📝 Option 2: Postman Collection

### Import this collection into Postman:

```json
{
  "info": {
    "name": "Rentify - Create Test Users",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Test User 1",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"username\": \"testuser1\",\n  \"email\": \"test1@example.com\",\n  \"password\": \"Test123!\",\n  \"name\": \"John Santos\"\n}"
        },
        "url": {
          "raw": "https://rentify-server-ge0f.onrender.com/api/auth/signup",
          "protocol": "https",
          "host": ["rentify-server-ge0f", "onrender", "com"],
          "path": ["api", "auth", "signup"]
        }
      }
    },
    {
      "name": "Create Test User 2",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"username\": \"testuser2\",\n  \"email\": \"test2@example.com\",\n  \"password\": \"Test123!\",\n  \"name\": \"Maria Cruz\"\n}"
        },
        "url": {
          "raw": "https://rentify-server-ge0f.onrender.com/api/auth/signup",
          "protocol": "https",
          "host": ["rentify-server-ge0f", "onrender", "com"],
          "path": ["api", "auth", "signup"]
        }
      }
    },
    {
      "name": "Create Test User 3",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"username\": \"testuser3\",\n  \"email\": \"test3@example.com\",\n  \"password\": \"Test123!\",\n  \"name\": \"Robert Kim\"\n}"
        },
        "url": {
          "raw": "https://rentify-server-ge0f.onrender.com/api/auth/signup",
          "protocol": "https",
          "host": ["rentify-server-ge0f", "onrender", "com"],
          "path": ["api", "auth", "signup"]
        }
      }
    },
    {
      "name": "Create Test User 4",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"username\": \"testuser4\",\n  \"email\": \"test4@example.com\",\n  \"password\": \"Test123!\",\n  \"name\": \"Lisa Wong\"\n}"
        },
        "url": {
          "raw": "https://rentify-server-ge0f.onrender.com/api/auth/signup",
          "protocol": "https",
          "host": ["rentify-server-ge0f", "onrender", "com"],
          "path": ["api", "auth", "signup"]
        }
      }
    },
    {
      "name": "Create Test User 5",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"username\": \"testuser5\",\n  \"email\": \"test5@example.com\",\n  \"password\": \"Test123!\",\n  \"name\": \"Michael Chen\"\n}"
        },
        "url": {
          "raw": "https://rentify-server-ge0f.onrender.com/api/auth/signup",
          "protocol": "https",
          "host": ["rentify-server-ge0f", "onrender", "com"],
          "path": ["api", "auth", "signup"]
        }
      }
    }
  ]
}
```

---

## 💻 Option 3: cURL Commands

Run these commands in your terminal:

```bash
# Create Test User 1
curl -X POST https://rentify-server-ge0f.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser1","email":"test1@example.com","password":"Test123!","name":"John Santos"}'

# Create Test User 2
curl -X POST https://rentify-server-ge0f.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser2","email":"test2@example.com","password":"Test123!","name":"Maria Cruz"}'

# Create Test User 3
curl -X POST https://rentify-server-ge0f.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser3","email":"test3@example.com","password":"Test123!","name":"Robert Kim"}'

# Create Test User 4
curl -X POST https://rentify-server-ge0f.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser4","email":"test4@example.com","password":"Test123!","name":"Lisa Wong"}'

# Create Test User 5
curl -X POST https://rentify-server-ge0f.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser5","email":"test5@example.com","password":"Test123!","name":"Michael Chen"}'
```

---

## 🧪 Testing Workflow

### Step 1: Create Users
Use any of the methods above to create 5 test users.

### Step 2: Test Messaging
1. Open browser 1 (normal mode)
2. Open browser 2 (incognito mode)
3. Login as `test1@example.com` in browser 1
4. Login as `test2@example.com` in browser 2
5. Both navigate to Messages page
6. Send messages between them!

### Step 3: Verify Real-Time
- Message sent from Browser 1 should appear instantly in Browser 2
- Message sent from Browser 2 should appear instantly in Browser 1
- Both users should see each other in contacts list

---

## 📊 Test Scenarios

### Scenario 1: Two Users
- Login as User 1 and User 2
- Test basic messaging

### Scenario 2: Group Testing
- Login as User 1, 2, and 3 in different browsers
- Test multiple conversations

### Scenario 3: Online Status
- Keep User 1 and 2 logged in
- Login/logout User 3
- Verify online status updates

### Scenario 4: Message History
- Send messages between User 1 and 2
- Logout both users
- Login again
- Verify message history loads

---

## 🎯 Expected Results

After creating test users:

### In Console:
```
👥 Fetching users from backend...
✅ Fetched users from backend: {users: Array(4)}
```

### In UI:
- Should see 4 other users in contacts list (excluding current user)
- Each user should have name, avatar, online status
- Click user to start conversation

---

## 🔍 Verification Checklist

- [ ] All 5 users created successfully
- [ ] Each user can login
- [ ] Users appear in contacts list
- [ ] Can select user to chat with
- [ ] Messages send successfully
- [ ] Messages appear in real-time
- [ ] Message history persists
- [ ] WebSocket shows "Connected"
- [ ] No 404/500 errors in console

---

## 🐛 Troubleshooting

### Issue: "Email already exists"
**Solution:** Users already created. Try logging in instead.

### Issue: "Username already exists"
**Solution:** Change username in request.

### Issue: Users don't appear in contacts
**Solution:** 
1. Check if `/api/auth/users` endpoint exists
2. Verify you're logged in
3. Check console for errors

### Issue: Can't send messages
**Solution:**
1. Ensure both users exist in database
2. Check WebSocket connection
3. Verify IDs are valid ObjectIds

---

## 📝 Clean Up Test Users

If you need to remove test users later:

### Option 1: MongoDB Compass
```javascript
// Delete test users
db.users.deleteMany({
  email: { $regex: /^test\d@example\.com$/ }
})
```

### Option 2: Backend Endpoint (if you create one)
```
DELETE /api/auth/users/cleanup
```

---

## 🎊 Quick Start

**Fastest way to test:**

1. **Create 2 users** using signup page
2. **Login as User 1** in normal browser
3. **Login as User 2** in incognito browser
4. **Both go to Messages** page
5. **Send message** from User 1
6. **See it appear instantly** in User 2!

---

**Time to create all users:** 5 minutes  
**Recommended:** Create at least 2 users for testing real-time messaging
