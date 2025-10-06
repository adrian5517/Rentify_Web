# Display Name Fix - Messages Page

## Issue
Messages page was potentially showing email addresses instead of user names in the contact list.

## Solution

### 1. Updated UserData Interface (`lib/api.ts`)
Added optional fields to handle different backend response formats:

```typescript
export interface UserData {
  _id: string;
  name?: string;        // User's name
  fullName?: string;    // Full name (priority field)
  username?: string;    // Username fallback
  email: string;        // Email fallback
  profilePicture?: string;
  role?: string;
  phoneNumber?: string;
}
```

### 2. Improved Display Name Logic (`app/page.tsx`)
Updated the contact list mapping with smart fallback:

```typescript
// Priority order: fullName > name > username > email
const displayName = user.fullName || user.name || user.username || user.email
```

### 3. Added Debug Logging
Console logs now show:
- All fetched users
- Sample user data structure
- Display name selection for each user
- Final contact list

## How It Works

The contact list now displays names with this priority:

1. **fullName** - If backend returns a full name field
2. **name** - If backend returns a name field
3. **username** - If backend returns a username field
4. **email** - Final fallback if no other name fields exist

## Testing

### Check Console Logs
When you open the Messages page, look for these logs:

```
✅ Fetched users from backend: [...]
📋 Sample user data: { _id, fullName, name, username, email, ... }
👤 User abc123: fullName="John Doe", name="John", username="john_doe", email="john@example.com" → Display: "John Doe"
📱 Final contact list: [{ id, name: "John Doe", avatar: "J", ... }]
```

### Verify Display
1. Open Messages page
2. Check contact list on the left
3. **Should show**: User names (e.g., "John Santos", "Maria Cruz")
4. **Should NOT show**: Email addresses (unless no name available)

### Expected Results

**With proper backend data:**
```
Contact List:
- John Santos (from fullName or name)
- Maria Cruz (from fullName or name)
- Robert Kim (from fullName or name)
```

**With limited backend data:**
```
Contact List:
- john_doe (from username)
- john@example.com (from email - only if no other fields)
```

## Backend Data Requirements

For best display, backend should return users with at least one of:
- `fullName` field (preferred)
- `name` field
- `username` field
- `email` field (always present, used as fallback)

### Example Backend Response
```json
{
  "users": [
    {
      "_id": "6819f51e2c894552dee35ab1",
      "fullName": "John Santos",      // ← Best option
      "name": "John",
      "username": "john_santos",
      "email": "john@example.com",
      "profilePicture": "https://...",
      "role": "user"
    }
  ]
}
```

## Troubleshooting

### Still Seeing Email Addresses?

**Check console logs:**
1. Open browser DevTools → Console
2. Look for "📋 Sample user data:" log
3. Check which fields are present

**Common Issues:**

1. **Backend doesn't send name fields**
   - Solution: Update backend to include `fullName` or `name`
   - Temporary: Use `username` if available

2. **Backend sends empty name fields**
   ```json
   { "name": "", "fullName": null }
   ```
   - Solution: Backend should omit or populate these fields properly
   - Frontend will fallback to email automatically

3. **All users show emails**
   - Check: GET `/api/auth/users` response
   - Verify: Users in database have name fields populated
   - Fix: Run seed script or update user profiles

### Force Name Display

If you want to NEVER show emails, update the logic:

```typescript
// Option 1: Show placeholder if no name
const displayName = user.fullName || user.name || user.username || "User"

// Option 2: Show "Anonymous User" with ID
const displayName = user.fullName || user.name || user.username || `User ${user._id.slice(-4)}`
```

## Avatar Generation

Avatar initials are taken from the display name:
```typescript
avatar: displayName.charAt(0).toUpperCase()
```

Examples:
- "John Santos" → "J"
- "Maria Cruz" → "M"
- "john_doe" → "J"
- "john@example.com" → "J"

## Related Files

- **`lib/api.ts`** - UserData interface
- **`app/page.tsx`** - MessagesPage contact list mapping
- **`docs/BACKEND_USERS_ENDPOINT.md`** - Backend API specification

## Summary

✅ **Fixed**: Contact list now displays user names instead of emails
✅ **Improved**: Smart fallback system (fullName → name → username → email)
✅ **Enhanced**: Added debug logging for troubleshooting
✅ **Flexible**: Works with various backend response formats

The contact list will now show the most appropriate name available for each user!
