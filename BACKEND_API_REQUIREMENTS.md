# Backend API Requirements for Profile Page

## Overview
The frontend profile page requires two API endpoints to enable full profile management functionality. Currently, profile updates are stored locally. These endpoints will enable server-side persistence.

---

## 🔐 Authentication
Both endpoints require JWT authentication:
- **Header**: `Authorization: Bearer <token>`
- **Token Source**: Provided in request headers from authenticated users
- **User Identification**: Extract `userId` from JWT token or use route parameter

---

## 📍 Required Endpoints

### 1. **Update User Profile**

#### Endpoint
```
PUT /api/auth/update-profile/:userId
```
or
```
PUT /api/users/:userId
```

#### Description
Updates user profile information including name, email, phone, location, and bio.

#### Request Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <jwt_token>"
}
```

#### URL Parameters
- `userId` (string, required): The MongoDB ObjectId of the user to update

#### Request Body
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "location": "New York, USA",
  "bio": "Software developer passionate about real estate"
}
```

#### Field Specifications
| Field    | Type   | Required | Max Length | Description                    |
|----------|--------|----------|------------|--------------------------------|
| name     | String | No       | 100        | User's full name               |
| email    | String | Yes      | 255        | User's email (must be unique)  |
| phone    | String | No       | 20         | Contact phone number           |
| location | String | No       | 100        | City, Country                  |
| bio      | String | No       | 500        | User biography/description     |

#### Response (Success - 200 OK)
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "location": "New York, USA",
    "bio": "Software developer passionate about real estate",
    "profilePicture": "https://example.com/uploads/profiles/user123.jpg",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-10-14T15:45:00.000Z"
  }
}
```

#### Response (Error - 400 Bad Request)
```json
{
  "success": false,
  "message": "Email already exists"
}
```

#### Response (Error - 401 Unauthorized)
```json
{
  "success": false,
  "message": "Unauthorized: Invalid or expired token"
}
```

#### Response (Error - 404 Not Found)
```json
{
  "success": false,
  "message": "User not found"
}
```

#### Validation Rules
1. **Email**: Must be valid email format and unique across users
2. **Phone**: Optional, but if provided, validate format
3. **Name**: Trim whitespace, minimum 2 characters
4. **Bio**: Maximum 500 characters
5. **Location**: Maximum 100 characters
6. **User Authorization**: Ensure the requesting user can only update their own profile (check JWT userId matches route userId)

#### Implementation Notes
- Use mongoose `findByIdAndUpdate()` with `{ new: true, runValidators: true }`
- Hash password if it's included in update (though not recommended in this endpoint)
- Don't allow updating `username` or `_id`
- Sanitize all inputs to prevent XSS attacks
- Log profile update actions for security audit

---

### 2. **Upload Profile Picture**

#### Endpoint
```
POST /api/auth/upload-profile-picture/:userId
```
or
```
POST /api/users/:userId/profile-picture
```

#### Description
Uploads and updates user profile picture. Handles image upload, validation, storage, and database update.

#### Request Headers
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

#### URL Parameters
- `userId` (string, required): The MongoDB ObjectId of the user

#### Request Body (Form Data)
```
profilePicture: <File> (binary image data)
```

#### File Specifications
| Property      | Value                                    |
|---------------|------------------------------------------|
| Field Name    | `profilePicture`                         |
| Allowed Types | image/jpeg, image/png, image/jpg, image/webp |
| Max Size      | 5 MB (5,242,880 bytes)                   |
| Dimensions    | Recommended: 400x400px minimum           |

#### Response (Success - 200 OK)
```json
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "profilePictureUrl": "https://your-cdn.com/uploads/profiles/507f1f77bcf86cd799439011_1697294400000.jpg",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "profilePicture": "https://your-cdn.com/uploads/profiles/507f1f77bcf86cd799439011_1697294400000.jpg"
  }
}
```

#### Response (Error - 400 Bad Request)
```json
{
  "success": false,
  "message": "Invalid file type. Only JPEG, PNG, and WebP images are allowed"
}
```

#### Response (Error - 413 Payload Too Large)
```json
{
  "success": false,
  "message": "File size exceeds 5MB limit"
}
```

#### Response (Error - 401 Unauthorized)
```json
{
  "success": false,
  "message": "Unauthorized: Invalid or expired token"
}
```

#### Implementation Requirements

##### 1. **File Upload Middleware**
Use `multer` for handling multipart/form-data:
```javascript
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profiles/') // Ensure this directory exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, req.params.userId + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  }
});
```

##### 2. **Image Processing** (Optional but Recommended)
Use `sharp` for image optimization:
```javascript
const sharp = require('sharp');

// Resize and optimize image
await sharp(file.path)
  .resize(400, 400, { fit: 'cover' })
  .jpeg({ quality: 85 })
  .toFile(optimizedPath);
```

##### 3. **Storage Options**

**Option A: Local Storage**
```javascript
const profilePictureUrl = `/uploads/profiles/${filename}`;
```

**Option B: Cloud Storage (AWS S3, Cloudinary, etc.)**
```javascript
// Upload to cloud storage
const uploadResult = await cloudinary.uploader.upload(file.path);
const profilePictureUrl = uploadResult.secure_url;
```

##### 4. **Database Update**
```javascript
const user = await User.findByIdAndUpdate(
  userId,
  { profilePicture: profilePictureUrl },
  { new: true, runValidators: true }
);
```

##### 5. **Delete Old Profile Picture**
```javascript
// If user had an old profile picture, delete it
if (user.profilePicture && user.profilePicture !== profilePictureUrl) {
  // Delete old file from storage
  fs.unlink(oldFilePath, (err) => {
    if (err) console.error('Error deleting old profile picture:', err);
  });
}
```

#### Security Considerations
1. **Verify User Authorization**: User can only upload their own profile picture
2. **File Type Validation**: Only allow image files (MIME type check)
3. **File Size Limit**: Enforce 5MB maximum
4. **Filename Sanitization**: Prevent directory traversal attacks
5. **Virus Scanning**: Consider implementing for production
6. **Rate Limiting**: Prevent abuse (e.g., max 5 uploads per hour per user)

---

## 📋 Database Schema Update

Ensure your User model includes these fields:

```javascript
const UserSchema = new mongoose.Schema({
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
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  phone: {
    type: String,
    trim: true,
    maxlength: 20
  },
  location: {
    type: String,
    trim: true,
    maxlength: 100
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500
  },
  profilePicture: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Automatically manage createdAt and updatedAt
});
```

---

## 🧪 Testing Endpoints

### Test Profile Update with cURL:
```bash
curl -X PUT https://rentify-server-ge0f.onrender.com/api/users/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "location": "New York, USA",
    "bio": "Real estate enthusiast"
  }'
```

### Test Profile Picture Upload with cURL:
```bash
curl -X POST https://rentify-server-ge0f.onrender.com/api/users/507f1f77bcf86cd799439011/profile-picture \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "profilePicture=@/path/to/image.jpg"
```

---

## 🔧 Frontend Integration

Once the backend endpoints are ready, update the frontend code:

### Update Profile (components/profile-page.tsx)
```javascript
const handleSaveProfile = async () => {
  const response = await fetch(`https://rentify-server-ge0f.onrender.com/api/users/${user._id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(formData)
  })
  
  const data = await response.json()
  if (data.success) {
    useAuthStore.setState({ user: data.user })
  }
}
```

### Upload Profile Picture (components/profile-page.tsx)
```javascript
const handleFileChange = async (e) => {
  const formData = new FormData()
  formData.append('profilePicture', file)
  
  const response = await fetch(`https://rentify-server-ge0f.onrender.com/api/users/${user._id}/profile-picture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  })
  
  const data = await response.json()
  if (data.success) {
    useAuthStore.setState({ user: data.user })
  }
}
```

---

## 📦 Required NPM Packages

```bash
npm install multer sharp
```

- **multer**: Handle multipart/form-data for file uploads
- **sharp**: Image processing and optimization (optional but recommended)

---

## 🚀 Implementation Checklist

- [ ] Create `PUT /api/users/:userId` endpoint
- [ ] Create `POST /api/users/:userId/profile-picture` endpoint
- [ ] Add multer middleware for file uploads
- [ ] Implement file validation (type, size)
- [ ] Add image optimization with sharp
- [ ] Update User model schema with new fields
- [ ] Implement authentication middleware
- [ ] Add authorization check (user can only update own profile)
- [ ] Test endpoints with Postman/cURL
- [ ] Setup uploads directory with proper permissions
- [ ] Configure CORS to allow file uploads
- [ ] Add rate limiting to prevent abuse
- [ ] Document API in Swagger/Postman collection

---

## 📞 Questions or Issues?

If you need clarification on any endpoint or have questions about implementation:

1. Check existing auth endpoints (`/api/auth/signup`, `/api/auth/login`) for reference
2. Ensure JWT middleware is properly configured
3. Test with Postman before integrating with frontend
4. Return consistent JSON response format

---

**Server Base URL**: `https://rentify-server-ge0f.onrender.com`  
**Frontend Repository**: Rentify_Web (adrian5517)  
**Date**: October 14, 2025
