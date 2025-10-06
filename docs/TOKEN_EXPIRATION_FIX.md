# Token Expiration Fix

## Issue
JWT tokens expire after a certain period (usually 1 hour, 24 hours, or 7 days depending on backend configuration). When this happens, API requests return `401 Unauthorized` errors.

## Solution Implemented

### 1. Automatic Token Validation
All API functions now check for 401 status and automatically handle expired tokens:

```typescript
if (response.status === 401) {
  console.error('❌ Unauthorized: Token expired or invalid');
  handleUnauthorized();
  return []; // or throw error
}
```

### 2. Auto-Logout on Expiration
When a token expires, the app will:
1. Clear the auth storage
2. Redirect to the login page
3. Show a warning message in console

### 3. Graceful Degradation
- API functions return empty arrays instead of crashing
- User can continue using cached data until redirect
- No app crashes or white screens

## How It Works

### Updated Functions in `lib/api.ts`

#### handleUnauthorized()
```typescript
const handleUnauthorized = () => {
  console.warn('⚠️ Token expired or invalid. Please log in again.');
  localStorage.removeItem('auth-storage');
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
};
```

#### All API Functions
- `fetchMessages()` - Returns empty array on 401
- `sendMessageAPI()` - Throws error with message on 401
- `deleteMessage()` - Throws error with message on 401
- `fetchUsers()` - Returns empty array on 401

## User Experience

### Before Fix
```
❌ Failed to fetch users: 401 "{"message":"Unauthorized","error":"jwt expired"}"
🔴 App crashes or shows error
```

### After Fix
```
⚠️ Token expired or invalid. Please log in again.
✅ App clears auth and redirects to login page
✅ User can log in again seamlessly
```

## Testing

### Test Token Expiration
1. Login to the app
2. Wait for token to expire (or manually edit token in localStorage)
3. Try to:
   - Fetch messages
   - Send a message
   - Fetch user list
4. **Expected**: Console shows warning, app redirects to login

### Verify Auto-Logout
```javascript
// In browser console
localStorage.setItem('auth-storage', JSON.stringify({
  state: { token: 'invalid_token' }
}));

// Refresh page
// Try any API action
// Should auto-logout
```

## Configuration

### Backend Token Expiration Settings
Check your backend `.env` file:

```env
# Example configurations
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=24h  # Token expires after 24 hours
# or
JWT_EXPIRES_IN=7d   # Token expires after 7 days
```

### Common Expiration Times
- Development: `1h` (1 hour)
- Testing: `24h` (1 day)
- Production: `7d` (7 days) or `30d` (30 days)

## Preventing Frequent Logouts

### Option 1: Increase Token Expiration (Backend)
```javascript
// backend/controllers/authController.js
const token = jwt.sign(
  { userId: user._id },
  process.env.JWT_SECRET,
  { expiresIn: '7d' } // Change from 1h to 7d
);
```

### Option 2: Implement Refresh Tokens (Future Enhancement)
```typescript
// lib/api.ts (future implementation)
const refreshToken = async () => {
  const refreshToken = getRefreshToken();
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  // Update token in storage
};
```

### Option 3: Remember Me Feature (Future Enhancement)
```typescript
// Longer-lived tokens for "Remember Me" option
if (rememberMe) {
  tokenExpiration = '30d';
} else {
  tokenExpiration = '24h';
}
```

## Error Messages

### Console Warnings
- `⚠️ Token expired or invalid. Please log in again.` - Token expired
- `⚠️ No auth token found. User needs to login.` - No token in storage
- `❌ Unauthorized: Token expired or invalid` - API returned 401

### User-Facing Messages (Future)
Consider adding a toast notification:
```typescript
// Using a toast library
toast.warning('Your session has expired. Please log in again.');
```

## Troubleshooting

### Issue: Constant Logouts
**Cause**: Token expiration too short
**Solution**: Increase `JWT_EXPIRES_IN` in backend

### Issue: Token Never Expires
**Cause**: No expiration set in backend
**Solution**: Add `expiresIn` option to jwt.sign()

### Issue: 401 on First Request
**Cause**: Token not saved correctly during login
**Solution**: Check login/signup API response saves token to `auth-storage`

### Issue: Redirect Loop
**Cause**: Login page making authenticated requests
**Solution**: Add auth check before API calls:
```typescript
if (!isAuthPage && !token) {
  // Don't redirect on login/signup pages
}
```

## Best Practices

### 1. Token Storage
✅ Use Zustand persist middleware (current implementation)
❌ Don't store tokens in regular state (lost on refresh)

### 2. API Error Handling
✅ Check for 401 in every API call
✅ Return empty data instead of throwing (where safe)
✅ Clear auth on 401 errors

### 3. User Experience
✅ Auto-logout on token expiration
✅ Redirect to login page
✅ Show helpful error messages
❌ Don't show cryptic JWT errors to users

### 4. Security
✅ Clear token on logout
✅ Don't extend expiration infinitely
✅ Use HTTPS in production
❌ Don't store tokens in cookies (XSS risk)

## Future Enhancements

### 1. Token Refresh
- Implement refresh token endpoint in backend
- Auto-refresh before expiration
- Silent background refresh

### 2. Session Management
- Track active sessions in database
- Allow users to logout from all devices
- Show login history

### 3. Better UX
- Toast notifications for errors
- "Keep me logged in" checkbox
- Session timeout warning (5 minutes before expiry)

### 4. Token Validation
- Validate token format before API calls
- Check expiration client-side
- Decode JWT to show remaining time

## Summary

✅ **Fixed**: All API functions now handle 401 errors gracefully
✅ **Auto-logout**: Token expiration triggers automatic logout
✅ **No crashes**: App returns empty data instead of breaking
✅ **User-friendly**: Redirects to login for re-authentication

**Next Steps**:
1. Test with expired token
2. Verify auto-logout works
3. Consider increasing token expiration time
4. Plan refresh token implementation for better UX
