# Backend API Endpoint - Get All Users

## Overview
This endpoint returns a list of all registered users in the system, excluding the current user's password and sensitive information. Used for the messaging contacts list.

---

## 📍 Endpoint Details

**Route:** `GET /api/auth/users`  
**Authentication:** Required (JWT Bearer Token)  
**Controller:** `getUsersForMessaging`  
**File:** `controllers/authController.js`

---

## 🔐 Request

### Headers
```javascript
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Query Parameters (Optional)
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `search` | string | Search by name, username, or email | - |
| `limit` | number | Maximum number of users to return | 50 |
| `exclude` | string | User ID to exclude from results | - |

### Example Request
```javascript
GET /api/auth/users
GET /api/auth/users?search=john
GET /api/auth/users?limit=20&exclude=6819f51e2c894552dee35ab1
```

---

## ✅ Response

### Success Response (200 OK)
```json
{
  "success": true,
  "users": [
    {
      "_id": "6819f51e2c894552dee35ab1",
      "username": "john_doe",
      "email": "john@example.com",
      "name": "John Doe",
      "profilePicture": "https://api.dicebear.com/7.x/avataaars/svg?seed=john@example.com",
      "createdAt": "2025-05-06T11:40:14.319Z"
    },
    {
      "_id": "6819f51e2c894552dee35ab2",
      "username": "jane_smith",
      "email": "jane@example.com",
      "name": "Jane Smith",
      "profilePicture": "https://api.dicebear.com/7.x/avataaars/svg?seed=jane@example.com",
      "createdAt": "2025-05-07T09:15:30.123Z"
    }
  ]
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to fetch users",
  "error": "Error details..."
}
```

---

## 💻 Backend Implementation

### 1. Route (routes/authRoutes.js)
```javascript
const express = require('express');
const router = express.Router();
const { 
  signup, 
  login, 
  getUsersForMessaging 
} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Existing routes
router.post('/signup', signup);
router.post('/login', login);

// New route for getting users
router.get('/users', authMiddleware, getUsersForMessaging);

module.exports = router;
```

### 2. Controller (controllers/authController.js)
```javascript
const User = require('../models/User');

// Get all users for messaging (excluding current user)
const getUsersForMessaging = async (req, res) => {
  try {
    const currentUserId = req.user.id; // From authMiddleware
    const { search, limit = 50, exclude } = req.query;

    // Build query
    let query = {
      _id: { $ne: exclude || currentUserId } // Exclude specified user or current user
    };

    // Add search filter if provided
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch users
    const users = await User.find(query)
      .select('_id username email name profilePicture createdAt') // Exclude password
      .limit(parseInt(limit))
      .sort({ createdAt: -1 }); // Most recent first

    res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

module.exports = {
  signup,
  login,
  getUsersForMessaging
};
```

### 3. Auth Middleware (middleware/authMiddleware.js)
```javascript
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Contains { id, iat, exp }
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

module.exports = authMiddleware;
```

---

## 🧪 Testing the Endpoint

### Using Postman

**1. Get your JWT token:**
```
POST /api/auth/login
Body: { "email": "user@example.com", "password": "password123" }
Response: { "token": "eyJhbG..." }
```

**2. Test the users endpoint:**
```
GET /api/auth/users
Headers: { "Authorization": "Bearer eyJhbG..." }
Expected: List of all users (excluding current user)
```

**3. Test with search:**
```
GET /api/auth/users?search=john
Headers: { "Authorization": "Bearer eyJhbG..." }
Expected: Users matching "john" in username, email, or name
```

### Using cURL
```bash
# Get all users
curl -X GET \
  https://rentify-server-ge0f.onrender.com/api/auth/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Search for users
curl -X GET \
  "https://rentify-server-ge0f.onrender.com/api/auth/users?search=john" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📊 Database Schema

Ensure your User model has these fields:

```javascript
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    trim: true
  },
  profilePicture: {
    type: String,
    default: function() {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.email}`;
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, { 
  timestamps: true 
});
```

---

## 🔍 Security Considerations

### ✅ What to Include:
- User ID
- Username
- Email
- Name
- Profile picture
- Creation date

### ❌ What to Exclude:
- Password (hashed or not)
- JWT tokens
- Reset tokens
- IP addresses
- Sensitive personal data

### 🔐 Additional Security:
```javascript
// Always exclude sensitive fields
.select('-password -resetToken -__v')

// Limit results to prevent database overload
.limit(parseInt(limit) || 50)

// Validate JWT token
authMiddleware

// Sanitize search input
const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

---

## 📝 Implementation Checklist

- [ ] Create/update `controllers/authController.js`
- [ ] Add `getUsersForMessaging` function
- [ ] Update `routes/authRoutes.js`
- [ ] Add `GET /users` route with authMiddleware
- [ ] Ensure `authMiddleware.js` exists and works
- [ ] Test with Postman/cURL
- [ ] Verify password is excluded from response
- [ ] Test search functionality
- [ ] Deploy to production server
- [ ] Update API documentation

---

## 🎯 Expected Frontend Usage

Once implemented, the frontend will use it like this:

```typescript
// lib/api.ts
export const fetchUsers = async (): Promise<UserData[]> => {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/auth/users`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  
  const data = await response.json();
  return data.users; // Extract users array from response
};
```

---

## 🐛 Troubleshooting

### Issue: 401 Unauthorized
**Cause:** Token missing or invalid  
**Solution:** Ensure Authorization header is present and token is valid

### Issue: 500 Internal Server Error
**Cause:** Database connection issue or query error  
**Solution:** Check MongoDB connection and query syntax

### Issue: Empty array returned
**Cause:** No users in database or all filtered out  
**Solution:** Create test users using signup endpoint

### Issue: Password appears in response
**Cause:** `.select()` not excluding password  
**Solution:** Add `.select('-password')` to query

---

## 📚 Related Endpoints

- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - Login user
- `GET /api/messages/:userId1/:userId2` - Get messages
- `POST /api/messages/send` - Send message

---

## ✅ Success Criteria

Once implemented, you should be able to:
- ✅ Fetch all users via API
- ✅ See real users in messaging contacts list
- ✅ Search/filter users by name
- ✅ Password is never exposed
- ✅ Current user is excluded from list
- ✅ Returns proper error messages

---

**Priority:** High  
**Difficulty:** Easy  
**Time Estimate:** 30 minutes  
**Dependencies:** authMiddleware, User model
