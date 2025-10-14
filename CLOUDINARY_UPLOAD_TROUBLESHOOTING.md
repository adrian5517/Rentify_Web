# Cloudinary Upload Troubleshooting Guide

## 🐛 Issue: "Failed to upload image to Cloudinary"

This error can happen for several reasons. Follow this guide to diagnose and fix the issue.

---

## 🔍 Step 1: Check Browser Console

Open browser console (F12 → Console tab) and look for these logs:

### **What to Look For:**

```javascript
// Good logs (successful upload):
✅ "Step 1: Uploading image to Cloudinary..."
✅ "File details: { name, type, size }"
✅ "Upload response status: 200"
✅ "Upload response ok: true"
✅ "Upload response data: { fileUrl: '...' }"
✅ "✅ Upload successful! Image URL: ..."

// Bad logs (failed upload):
❌ "Upload response status: 400/500"
❌ "Upload response ok: false"
❌ "Response missing fileUrl"
❌ "Failed to parse JSON response"
```

---

## 🔧 Common Issues & Solutions

### **Issue 1: Server Not Running**

**Symptoms:**
```
❌ Failed to fetch
❌ NetworkError
❌ Connection refused
```

**Solution:**
```bash
# Check if backend server is running
curl https://rentify-server-ge0f.onrender.com/upload

# Or visit in browser:
https://rentify-server-ge0f.onrender.com/upload
```

**If server is down:**
- Contact backend team
- Check server logs
- Restart the server

---

### **Issue 2: Wrong Field Name**

**Symptoms:**
```
❌ "No file uploaded"
❌ "File is required"
❌ Response status: 400
```

**Solution:**
The field name MUST be `'propertyImage'`:

```javascript
// ✅ CORRECT
formData.append('propertyImage', file)

// ❌ WRONG
formData.append('image', file)
formData.append('file', file)
formData.append('profilePicture', file)
```

**Current code already uses correct field name** ✅

---

### **Issue 3: File Too Large**

**Symptoms:**
```
❌ "Request entity too large"
❌ "Payload too large"
❌ Response status: 413
```

**Solution:**
Check file size in console logs:
```javascript
File details: { size: 8388608, sizeInMB: '8.00MB' }
```

If > 5MB:
- Compress the image
- Resize before upload
- Use smaller image

---

### **Issue 4: Invalid File Type**

**Symptoms:**
```
❌ "Invalid file type"
❌ "Only images allowed"
```

**Solution:**
Check file type in console:
```javascript
File details: { type: 'image/jpeg' } // ✅ Good
File details: { type: 'application/pdf' } // ❌ Bad
```

Allowed types:
- ✅ image/jpeg
- ✅ image/jpg
- ✅ image/png
- ✅ image/webp

---

### **Issue 5: CORS Error**

**Symptoms:**
```
❌ Access-Control-Allow-Origin error
❌ CORS policy blocked
```

**Solution:**
Backend needs to enable CORS for your frontend domain:

```javascript
// Backend should have:
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-domain.com'],
  credentials: true
}))
```

Contact backend team to verify CORS is enabled.

---

### **Issue 6: Cloudinary Not Configured**

**Symptoms:**
```
❌ "Cloudinary credentials missing"
❌ "Invalid cloud name"
❌ Response status: 500
```

**Solution:**
Backend needs Cloudinary environment variables:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Contact backend team to verify Cloudinary is configured.

---

### **Issue 7: Wrong Endpoint URL**

**Symptoms:**
```
❌ 404 Not Found
❌ "Cannot POST /upload"
```

**Solution:**
Verify the endpoint exists:

```javascript
// Current endpoint:
POST https://rentify-server-ge0f.onrender.com/upload

// Test with curl:
curl -X POST https://rentify-server-ge0f.onrender.com/upload \
  -F "propertyImage=@test.jpg"
```

If 404, check backend routes:
- Route might be `/api/upload` instead of `/upload`
- Contact backend team to verify correct endpoint

---

## 🧪 Testing Steps

### **1. Test with Postman/Thunder Client**

```
POST https://rentify-server-ge0f.onrender.com/upload
Body: form-data
Key: propertyImage
Type: File
Value: [Select an image]
```

Expected response:
```json
{
  "fileUrl": "https://res.cloudinary.com/..."
}
```

### **2. Test with cURL**

```bash
curl -X POST https://rentify-server-ge0f.onrender.com/upload \
  -F "propertyImage=@/path/to/test-image.jpg"
```

### **3. Check Network Tab**

1. Open DevTools (F12)
2. Go to Network tab
3. Upload an image
4. Click on the `/upload` request
5. Check:
   - Request Headers
   - Request Payload (FormData)
   - Response Headers
   - Response Body

---

## 💡 Fallback Option

If Cloudinary upload continues to fail, the app now offers a **local storage fallback**:

1. When upload fails, you'll see a confirmation dialog
2. Click "OK" to save image locally (base64)
3. Image will be stored in browser but NOT uploaded to cloud
4. **Limitation**: Image won't be accessible from other devices

---

## 🔍 Detailed Logging

The updated code now includes extensive logging. Check console for:

```javascript
// File information
File details: {
  name: "profile.jpg",
  type: "image/jpeg",
  size: 2097152,
  sizeInMB: "2.00MB"
}

// Request details
Sending request to: https://rentify-server-ge0f.onrender.com/upload

// Response details
Upload response status: 200
Upload response ok: true
Response content-type: application/json
Upload response data: { fileUrl: "https://..." }

// Success confirmation
✅ Upload successful! Image URL: https://...
```

---

## 🆘 Still Not Working?

If you've tried everything above and it still doesn't work:

### **1. Share Console Logs**
Copy all console logs and share with backend team:
```
Right-click in console → Save as... → console-logs.txt
```

### **2. Check Backend Logs**
Ask backend team to check server logs for errors

### **3. Test Backend Directly**
Use Postman to test if backend upload works independently

### **4. Verify Environment**
- Is backend in production or development?
- Are environment variables set correctly?
- Is Cloudinary account active?

### **5. Contact Backend Team**
Provide them with:
- Console logs
- Network tab screenshot
- Error message
- File details (size, type)

---

## ✅ Quick Fix Checklist

- [ ] Backend server is running
- [ ] Endpoint URL is correct: `/upload`
- [ ] Field name is `'propertyImage'`
- [ ] File size < 5MB
- [ ] File type is image (jpeg, png, webp)
- [ ] CORS is enabled on backend
- [ ] Cloudinary is configured on backend
- [ ] Check browser console for detailed logs
- [ ] Test with Postman/cURL first

---

## 📞 Backend Requirements

Your backend team needs to ensure:

```javascript
// 1. Multer configured correctly
const upload = multer({
  storage: multer.diskStorage({}),
  limits: { fileSize: 5 * 1024 * 1024 }
})

// 2. Upload route exists
app.post('/upload', upload.single('propertyImage'), async (req, res) => {
  // Upload to Cloudinary
  const result = await cloudinary.uploader.upload(req.file.path)
  res.json({ fileUrl: result.secure_url })
})

// 3. Cloudinary configured
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// 4. CORS enabled
app.use(cors())
```

---

## 🎯 Expected Response Format

Backend MUST return:
```json
{
  "fileUrl": "https://res.cloudinary.com/demo/image/upload/v1234567890/profile.jpg"
}
```

Any other format will cause "Failed to upload image to Cloudinary" error.

---

**Last Updated**: October 14, 2025  
**Status**: Enhanced with detailed logging and fallback option
