# 🔒 Security Implementation Guide - Rentify Web Application

## Overview
This document outlines the security measures implemented to protect the Rentify web application against common web vulnerabilities and attacks.

---

## 🛡️ Security Features Implemented

### 1. XSS (Cross-Site Scripting) Protection

**What it prevents:** Malicious scripts injected into web pages

**Implementation:**
- ✅ HTML escaping for all user-generated content
- ✅ Input sanitization using `sanitizeInput()` and `sanitizeHTML()`
- ✅ Removed dangerous `innerHTML` usage or replaced with safe alternatives
- ✅ Content Security Policy (CSP) headers

**Files:**
- `lib/security.ts` - Sanitization functions
- `middleware.ts` - CSP headers
- `components/property-map.tsx` - Sanitized tooltips and content

**Usage Example:**
```typescript
import { escapeHTML, sanitizeInput } from '@/lib/security'

// Escape user input before displaying
const safeUserName = escapeHTML(userInput)

// Sanitize form input
const safeSearchQuery = sanitizeInput(searchQuery)
```

---

### 2. SQL Injection Protection

**What it prevents:** Malicious SQL commands in user input

**Implementation:**
- ✅ Input sanitization for search queries
- ✅ Removal of SQL keywords and special characters
- ✅ Backend validation (recommended on server side)

**Files:**
- `lib/security.ts` - `sanitizeSearchQuery()` function

**Usage Example:**
```typescript
import { sanitizeSearchQuery } from '@/lib/security'

const safeQuery = sanitizeSearchQuery(userSearchTerm)
// Now safe to send to backend
```

---

### 3. Clickjacking Protection

**What it prevents:** Attacker embedding your site in an iframe to trick users

**Implementation:**
- ✅ `X-Frame-Options: DENY` header
- ✅ `frame-ancestors 'none'` in CSP
- ✅ Client-side iframe detection

**Files:**
- `middleware.ts` - HTTP headers
- `lib/security-hooks.ts` - `useClickjackingProtection()` hook

---

### 4. File Upload Security

**What it prevents:** Malicious file uploads, oversized files, wrong file types

**Implementation:**
- ✅ File type validation (whitelist approach)
- ✅ File size limits (default 10MB)
- ✅ File extension checking
- ✅ MIME type validation

**Files:**
- `lib/security.ts` - `validateFile()` function
- `lib/security-hooks.ts` - `useFileUpload()` hook

**Usage Example:**
```typescript
import { useFileUpload } from '@/lib/security-hooks'

const { files, errors, validateAndSetFiles } = useFileUpload(
  ['image/jpeg', 'image/png', 'image/webp'], // allowed types
  10 // max size in MB
)

// In your file input handler
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files) {
    validateAndSetFiles(e.target.files)
  }
}
```

---

### 5. Rate Limiting

**What it prevents:** Spam, brute force attacks, API abuse

**Implementation:**
- ✅ Client-side rate limiter class
- ✅ Configurable request limits per time window
- ✅ Per-action/per-user tracking

**Files:**
- `lib/security.ts` - `RateLimiter` class
- `lib/security-hooks.ts` - `useRateLimit()` hook

**Usage Example:**
```typescript
import { useRateLimit } from '@/lib/security-hooks'

const { checkLimit, getRemainingRequests } = useRateLimit(10, 1) // 10 requests per minute

const handleSubmit = () => {
  if (!checkLimit(userId)) {
    alert('Too many requests. Please try again later.')
    return
  }
  
  // Proceed with submission
}
```

---

### 6. CSRF (Cross-Site Request Forgery) Protection

**What it prevents:** Unauthorized commands from trusted users

**Implementation:**
- ✅ CSRF token generation
- ✅ Token validation on form submissions
- ✅ Session-based token storage

**Files:**
- `lib/security.ts` - Token generation/validation
- `lib/security-hooks.ts` - `useCSRFToken()` hook

**Usage Example:**
```typescript
import { useCSRFToken } from '@/lib/security-hooks'

const { token, validateToken } = useCSRFToken()

// Include token in form
<input type="hidden" name="csrf_token" value={token} />

// Validate before submission
if (!validateToken(submittedToken)) {
  throw new Error('Invalid CSRF token')
}
```

---

### 7. Session Timeout

**What it prevents:** Unauthorized access from unattended sessions

**Implementation:**
- ✅ Automatic logout after inactivity
- ✅ Configurable timeout period
- ✅ Activity-based timeout reset

**Files:**
- `lib/security-hooks.ts` - `useSessionTimeout()` hook

**Usage Example:**
```typescript
import { useSessionTimeout } from '@/lib/security-hooks'

const handleTimeout = () => {
  // Clear user session
  // Redirect to login
  router.push('/login')
}

useSessionTimeout(30, handleTimeout) // 30 minutes
```

---

### 8. Secure Storage

**What it prevents:** Exposure of sensitive data in localStorage

**Implementation:**
- ✅ Secure storage wrapper
- ✅ JSON serialization/deserialization
- ✅ Error handling
- ⚠️ **TODO:** Add encryption for sensitive data

**Files:**
- `lib/security.ts` - `secureStorage` object

**Usage Example:**
```typescript
import { secureStorage } from '@/lib/security'

// Save data
secureStorage.setItem('user-preferences', { theme: 'dark' })

// Retrieve data
const prefs = secureStorage.getItem<UserPreferences>('user-preferences')

// Remove data
secureStorage.removeItem('user-preferences')
```

---

### 9. Input Validation

**What it prevents:** Invalid data, injection attacks, format errors

**Implementation:**
- ✅ Email validation
- ✅ Phone number validation (Philippine format)
- ✅ URL validation
- ✅ Number validation with bounds

**Files:**
- `lib/security.ts` - Validation functions

**Usage Examples:**
```typescript
import { 
  isValidEmail, 
  isValidPhoneNumber, 
  isValidURL,
  validateNumber 
} from '@/lib/security'

// Email validation
if (!isValidEmail(email)) {
  setError('Invalid email format')
}

// Phone validation
if (!isValidPhoneNumber(phone)) {
  setError('Invalid phone number')
}

// Number validation with bounds
const priceValidation = validateNumber(price, 0, 1000000)
if (!priceValidation.valid) {
  setError(priceValidation.error)
}
```

---

### 10. Security Headers

**What it prevents:** Various browser-based attacks

**Implementation:**
- ✅ Content Security Policy (CSP)
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ X-XSS-Protection
- ✅ Strict-Transport-Security (HSTS)
- ✅ Referrer-Policy
- ✅ Permissions-Policy

**Files:**
- `middleware.ts` - All security headers

**Current Configuration:**
```typescript
// CSP allows:
- Self-hosted scripts and styles
- Mapbox API resources
- Backend API (Render)
- WebSocket connections
- Google Fonts

// Restricts:
- Inline scripts (except where necessary)
- External frames
- Dangerous browser features (camera, microphone)
```

---

## 🚨 Known Vulnerabilities & Recommendations

### 1. localStorage Encryption
**Status:** ⚠️ Not Implemented
**Risk:** Medium
**Recommendation:** Implement encryption for sensitive data stored in localStorage
```typescript
// TODO: Use a library like crypto-js
import CryptoJS from 'crypto-js'

const encryptedData = CryptoJS.AES.encrypt(data, secretKey).toString()
localStorage.setItem('key', encryptedData)
```

### 2. Server-Side Validation
**Status:** ⚠️ Backend Dependency
**Risk:** High if not implemented on backend
**Recommendation:** Ensure all client-side validations are also implemented on the backend
- Validate all form submissions
- Sanitize all database inputs
- Implement rate limiting on API endpoints

### 3. API Authentication
**Status:** ✅ Implemented (JWT via auth-storage)
**Recommendation:** Ensure proper token expiration and refresh mechanisms

### 4. HTTPS Only
**Status:** ⚠️ Environment Dependent
**Risk:** High in production without HTTPS
**Recommendation:** 
- Always use HTTPS in production
- Redirect HTTP to HTTPS
- Enable HSTS header (already implemented)

---

## 📋 Security Checklist

Before deploying to production:

- [ ] **Environment Variables**
  - [ ] All sensitive keys in `.env.local`
  - [ ] `.env.local` added to `.gitignore`
  - [ ] No hardcoded API keys in code

- [ ] **HTTPS**
  - [ ] SSL certificate installed
  - [ ] HTTP redirects to HTTPS
  - [ ] HSTS header enabled

- [ ] **Backend Security**
  - [ ] API rate limiting enabled
  - [ ] SQL injection protection
  - [ ] JWT token expiration configured
  - [ ] CORS properly configured

- [ ] **Input Validation**
  - [ ] All user inputs sanitized
  - [ ] File uploads validated
  - [ ] Form validation on client AND server

- [ ] **Headers**
  - [ ] Security headers configured
  - [ ] CSP policy tested
  - [ ] CORS policy configured

- [ ] **Testing**
  - [ ] Penetration testing performed
  - [ ] XSS attempts blocked
  - [ ] SQL injection attempts blocked
  - [ ] File upload restrictions working

---

## 🔧 How to Use Security Features

### In Components

```typescript
import { 
  useRateLimit, 
  useSecureInput, 
  useFileUpload,
  useCSRFToken,
  useSessionTimeout 
} from '@/lib/security-hooks'

function SecureForm() {
  // Rate limiting
  const { checkLimit } = useRateLimit(5, 1) // 5 requests per minute
  
  // Secure input
  const name = useSecureInput()
  const email = useSecureInput()
  
  // File upload
  const { files, errors, validateAndSetFiles } = useFileUpload()
  
  // CSRF protection
  const { token } = useCSRFToken()
  
  // Session timeout
  useSessionTimeout(30, () => {
    router.push('/login')
  })
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!checkLimit('form-submit')) {
      alert('Too many submissions. Please wait.')
      return
    }
    
    // Use sanitized values
    const data = {
      name: name.sanitizedValue,
      email: email.sanitizedValue,
      csrf_token: token
    }
    
    // Submit data...
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        value={name.value} 
        onChange={name.handleChange} 
      />
      <input 
        type="email" 
        value={email.value} 
        onChange={email.handleChange} 
      />
      <input type="hidden" value={token} />
      <button type="submit">Submit</button>
    </form>
  )
}
```

---

## 🔍 Monitoring & Logging

### CSP Violations
CSP violations are automatically logged to the console. In production, send them to a logging service:

```typescript
// In lib/security-hooks.ts - useCSPReporting()
document.addEventListener('securitypolicyviolation', (e) => {
  // Send to logging service
  fetch('/api/csp-report', {
    method: 'POST',
    body: JSON.stringify({
      blockedURI: e.blockedURI,
      violatedDirective: e.violatedDirective,
    }),
  })
})
```

### Rate Limit Monitoring
Track rate limit violations to detect abuse:

```typescript
const { checkLimit, getRemainingRequests } = useRateLimit()

if (!checkLimit(userId)) {
  // Log potential abuse
  console.warn(`Rate limit exceeded for user: ${userId}`)
  // Send alert to monitoring service
}
```

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Content Security Policy](https://content-security-policy.com/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

## 🔄 Regular Security Audits

Perform security audits:
- **Monthly:** Review access logs and rate limit violations
- **Quarterly:** Update dependencies and check for vulnerabilities
- **Annually:** Professional penetration testing

Run dependency audit:
```bash
pnpm audit
pnpm audit fix
```

---

## 📞 Security Incident Response

If a security issue is discovered:
1. **Assess the impact** - What data/users are affected?
2. **Contain the breach** - Disable affected features if necessary
3. **Fix the vulnerability** - Apply patches immediately
4. **Notify users** - If personal data was exposed
5. **Document** - Record what happened and how it was fixed
6. **Prevent** - Update security measures to prevent recurrence

---

**Last Updated:** November 4, 2025
**Security Status:** 🟢 Active Protection Enabled
**Next Audit:** December 2025
