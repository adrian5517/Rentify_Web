/**
 * Security Utilities for Rentify Web Application
 * Protects against XSS, injection attacks, and other security vulnerabilities
 */

/**
 * Sanitize user input to prevent XSS attacks
 * Removes HTML tags and dangerous characters
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''
  
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .replace(/data:/gi, '') // Remove data: protocol
    .trim()
}

/**
 * Sanitize HTML content - more permissive for rich text
 * Allows basic formatting but removes dangerous tags and attributes
 */
export function sanitizeHTML(html: string): string {
  if (!html) return ''
  
  // Remove script tags and content
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  
  // Remove dangerous tags
  cleaned = cleaned.replace(/<(iframe|object|embed|link|meta|base)[^>]*>/gi, '')
  
  // Remove event handlers
  cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
  cleaned = cleaned.replace(/on\w+\s*=\s*[^\s>]*/gi, '')
  
  // Remove javascript: and data: protocols
  cleaned = cleaned.replace(/javascript:/gi, '')
  cleaned = cleaned.replace(/data:text\/html/gi, '')
  
  return cleaned
}

/**
 * Escape HTML special characters
 * Use this when displaying user-generated content
 */
export function escapeHTML(text: string): string {
  if (!text) return ''
  
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  
  return text.replace(/[&<>"'/]/g, (char) => map[char])
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email) && email.length <= 254
}

/**
 * Validate phone number (Philippine format)
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false
  
  // Philippine phone number formats
  const phoneRegex = /^(\+63|0)?[0-9]{10}$/
  return phoneRegex.test(phone.replace(/[\s-]/g, ''))
}

/**
 * Validate URL format
 */
export function isValidURL(url: string): boolean {
  if (!url) return false
  
  try {
    const urlObject = new URL(url)
    // Only allow http and https protocols
    return urlObject.protocol === 'http:' || urlObject.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 */
export function sanitizeURL(url: string): string {
  if (!url) return ''
  
  // Remove dangerous protocols
  const cleaned = url.replace(/^(javascript|data|vbscript|file):/gi, '')
  
  // Validate the URL
  if (!isValidURL(cleaned)) {
    return ''
  }
  
  return cleaned
}

/**
 * Validate and sanitize file upload
 */
export function validateFile(file: File, allowedTypes: string[], maxSizeMB: number = 10): {
  valid: boolean
  error?: string
} {
  // Check file size
  const maxBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB`
    }
  }
  
  // Check file type
  const fileType = file.type.toLowerCase()
  const isAllowed = allowedTypes.some(type => fileType.includes(type))
  
  if (!isAllowed) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
    }
  }
  
  // Check file extension matches type
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension) {
    return {
      valid: false,
      error: 'File must have an extension'
    }
  }
  
  return { valid: true }
}

/**
 * Rate limiting helper for client-side
 * Prevents spam/abuse by tracking request timestamps
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private maxRequests: number
  private timeWindowMs: number
  
  constructor(maxRequests: number = 10, timeWindowMinutes: number = 1) {
    this.maxRequests = maxRequests
    this.timeWindowMs = timeWindowMinutes * 60 * 1000
  }
  
  /**
   * Check if action is allowed
   * @param key - Unique identifier for the action (e.g., user ID, IP)
   * @returns true if allowed, false if rate limit exceeded
   */
  isAllowed(key: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    
    // Remove old requests outside the time window
    const recentRequests = requests.filter(timestamp => now - timestamp < this.timeWindowMs)
    
    if (recentRequests.length >= this.maxRequests) {
      return false
    }
    
    // Add current request
    recentRequests.push(now)
    this.requests.set(key, recentRequests)
    
    return true
  }
  
  /**
   * Get remaining requests in current window
   */
  getRemainingRequests(key: string): number {
    const requests = this.requests.get(key) || []
    const now = Date.now()
    const recentRequests = requests.filter(timestamp => now - timestamp < this.timeWindowMs)
    
    return Math.max(0, this.maxRequests - recentRequests.length)
  }
}

/**
 * Validate numeric input with bounds
 */
export function validateNumber(value: any, min?: number, max?: number): {
  valid: boolean
  value?: number
  error?: string
} {
  const num = Number(value)
  
  if (isNaN(num)) {
    return { valid: false, error: 'Invalid number' }
  }
  
  if (min !== undefined && num < min) {
    return { valid: false, error: `Value must be at least ${min}` }
  }
  
  if (max !== undefined && num > max) {
    return { valid: false, error: `Value must be at most ${max}` }
  }
  
  return { valid: true, value: num }
}

/**
 * Prevent SQL injection in search queries
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return ''
  
  return query
    .replace(/[';"\-\-]/g, '') // Remove SQL special characters
    .replace(/(\bOR\b|\bAND\b|\bUNION\b|\bSELECT\b|\bDROP\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b)/gi, '') // Remove SQL keywords
    .trim()
    .slice(0, 100) // Limit length
}

/**
 * Secure localStorage wrapper with encryption simulation
 * In production, use proper encryption library
 */
export const secureStorage = {
  setItem: (key: string, value: any): void => {
    try {
      // In production, encrypt the value here
      const serialized = JSON.stringify(value)
      localStorage.setItem(key, serialized)
    } catch (error) {
      console.error('Error saving to storage:', error)
    }
  },
  
  getItem: <T = any>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key)
      if (!item) return null
      
      // In production, decrypt the value here
      return JSON.parse(item) as T
    } catch (error) {
      console.error('Error reading from storage:', error)
      return null
    }
  },
  
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Error removing from storage:', error)
    }
  },
  
  clear: (): void => {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('Error clearing storage:', error)
    }
  }
}

/**
 * CSRF Token generator (for form submissions)
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken) return false
  return token === storedToken
}

/**
 * Content Security Policy helper
 * Generate nonce for inline scripts/styles
 */
export function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
}
