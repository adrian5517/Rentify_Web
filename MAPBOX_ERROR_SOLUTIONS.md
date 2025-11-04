# Mapbox Map Error Solutions for Rentify

## ✅ Mga Na-fix Na:

### 1. **Environment Variable Configuration**
- ✅ Fixed `.env.example` to use correct variable name: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- ✅ `.env.local` already has valid Mapbox token
- ✅ Fallback token in code: `pk.eyJ1IjoiYWRyaWFuNTUxNyIsImEiOiJjbWZkdTg4dmIwMThpMnFyNG10cWJwZjRhIn0.JLRzE6qmyDfePYgSs11ALg`

### 2. **Enhanced Error Handling**
- ✅ Added token format validation (must start with 'pk.')
- ✅ Better error messages with helpful hints
- ✅ Increased timeout from 10s to 15s
- ✅ Added container size validation
- ✅ More detailed error logging

### 3. **Map Configuration Improvements**
- ✅ Added `maxTileCacheSize: 50` for better tile management
- ✅ Added `refreshExpiredTiles: true` for automatic refresh
- ✅ Container dimension logging for debugging

---

## 🔍 Common Map Errors and Solutions:

### Error 1: "Missing Mapbox access token"
**Cause:** Environment variable not loaded
**Solution:**
1. Make sure `.env.local` exists in project root
2. Restart dev server: `npm run dev`
3. Check console: Should show "Token: ✅ Available"

### Error 2: "Map loading timeout"
**Cause:** Slow internet or Mapbox service issue
**Solution:**
1. Check internet connection
2. Try refreshing the page
3. Map will retry automatically after 15 seconds
4. Check if Mapbox API is down: https://status.mapbox.com

### Error 3: "401 Unauthorized"
**Cause:** Invalid or expired Mapbox token
**Solution:**
1. Get new token: https://account.mapbox.com/access-tokens/
2. Update `.env.local`:
   ```bash
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_new_token_here
   ```
3. Restart dev server

### Error 4: "Map container has no size"
**Cause:** CSS issue or container not visible
**Solution:**
1. Check if map container has height in CSS
2. Try resizing browser window
3. Map will auto-resize when visible

### Error 5: "Style failed to load"
**Cause:** Mapbox style URL issue or network problem
**Solution:**
1. Check internet connection
2. Default style: `mapbox://styles/mapbox/streets-v12`
3. Try refreshing page

### Error 6: "Network error / Failed to fetch"
**Cause:** Internet connection or firewall
**Solution:**
1. Check internet connection
2. Check if firewall blocks Mapbox API
3. Try using VPN if blocked
4. Check browser console for CORS errors

---

## 📋 Debugging Checklist:

When map shows error, check console for these logs:

```
✅ Good:
🏗️ Initializing map...
🗺️ Token: ✅ Available
📦 Container: ✅ Ready
📍 Center: [lng, lat] Zoom: 12
✅ Mapbox token validated, creating map instance...
🗺️ Map instance created successfully!
📐 Container dimensions: { width: 800, height: 600 }
🎉 Map loaded successfully!

❌ Problems:
❌ Map container ref not available
❌ Missing Mapbox access token
❌ Invalid Mapbox token format
⚠️ Map container has no size!
🚨 Map error: [error details]
⏰ Map load timeout after 15 seconds
```

---

## 🛠️ Quick Fixes:

### Fix 1: Force Reload Token
```typescript
// In browser console:
localStorage.clear()
// Then refresh page
```

### Fix 2: Manual Map Resize
```typescript
// If map shows blank:
window.dispatchEvent(new Event('resize'))
```

### Fix 3: Check Token in Console
```typescript
// In browser console:
console.log(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN)
// Should show: pk.eyJ1Ij...
```

### Fix 4: Test Mapbox Token
Visit this URL in browser (replace `YOUR_TOKEN`):
```
https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=YOUR_TOKEN
```
Should return JSON if token is valid.

---

## 🎯 Current Mapbox Token:
```
pk.eyJ1IjoiYWRyaWFuNTUxNyIsImEiOiJjbWZkdTg4dmIwMThpMnFyNG10cWJwZjRhIn0.JLRzE6qmyDfePYgSs11ALg
```

**To verify it's working:**
https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=pk.eyJ1IjoiYWRyaWFuNTUxNyIsImEiOiJjbWZkdTg4dmIwMThpMnFyNG10cWJwZjRhIn0.JLRzE6qmyDfePYgSs11ALg

---

## 📞 Still Having Issues?

### Check:
1. ✅ `.env.local` file exists in project root
2. ✅ Environment variable name is exactly `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
3. ✅ Dev server restarted after creating `.env.local`
4. ✅ Internet connection is working
5. ✅ Mapbox API status: https://status.mapbox.com
6. ✅ Browser console shows no CORS errors
7. ✅ Browser has JavaScript enabled
8. ✅ No ad blockers blocking Mapbox API

### Console Commands to Debug:
```javascript
// 1. Check if token is loaded
console.log('Token:', process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN)

// 2. Check mapbox-gl version
console.log('Mapbox GL:', mapboxgl.version)

// 3. Test map creation
const testMap = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [121.0244, 14.5547], // Manila
  zoom: 12
})
```

---

## 🔄 After Making Changes:

1. **Always restart dev server:**
   ```bash
   # Stop: Ctrl+C
   npm run dev
   ```

2. **Clear browser cache:**
   - Chrome: Ctrl+Shift+Delete
   - Or hard refresh: Ctrl+Shift+R

3. **Check console for new logs:**
   - F12 → Console tab
   - Look for green ✅ or red ❌ emojis

---

## ✨ Map Should Now Work!

The improvements made:
- ✅ Better error messages
- ✅ Token validation
- ✅ Longer timeout (15s)
- ✅ Auto-retry logic
- ✅ Container size checks
- ✅ Detailed logging

If you still see errors, check the console logs - they will now show exactly what went wrong and how to fix it! 🎉
