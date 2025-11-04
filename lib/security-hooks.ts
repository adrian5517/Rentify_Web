/**
 * React Hooks for Security Features
 * Provides client-side security utilities for React components
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { RateLimiter, sanitizeInput, validateFile } from './security'

/**
 * Hook for rate limiting user actions
 * Prevents spam and abuse
 */
export function useRateLimit(maxRequests: number = 10, timeWindowMinutes: number = 1) {
  const limiterRef = useRef(new RateLimiter(maxRequests, timeWindowMinutes))
  
  const checkLimit = useCallback((key: string = 'default'): boolean => {
    return limiterRef.current.isAllowed(key)
  }, [])
  
  const getRemainingRequests = useCallback((key: string = 'default'): number => {
    return limiterRef.current.getRemainingRequests(key)
  }, [])
  
  return { checkLimit, getRemainingRequests }
}

/**
 * Hook for secure form input handling
 * Automatically sanitizes user input
 */
export function useSecureInput(initialValue: string = '') {
  const [value, setValue] = useState(initialValue)
  const [sanitizedValue, setSanitizedValue] = useState(initialValue)
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const rawValue = e.target.value
    setValue(rawValue)
    setSanitizedValue(sanitizeInput(rawValue))
  }, [])
  
  const setSecureValue = useCallback((newValue: string) => {
    setValue(newValue)
    setSanitizedValue(sanitizeInput(newValue))
  }, [])
  
  return {
    value,
    sanitizedValue,
    handleChange,
    setValue: setSecureValue,
  }
}

/**
 * Hook for file upload validation
 */
export function useFileUpload(
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp'],
  maxSizeMB: number = 10
) {
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  
  const validateAndSetFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: File[] = []
    const newErrors: string[] = []
    const newPreviews: string[] = []
    
    Array.from(fileList).forEach((file) => {
      const validation = validateFile(file, allowedTypes, maxSizeMB)
      
      if (validation.valid) {
        newFiles.push(file)
        
        // Create preview for images
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = (e) => {
            if (e.target?.result) {
              setPreviews(prev => [...prev, e.target!.result as string])
            }
          }
          reader.readAsDataURL(file)
        }
      } else {
        newErrors.push(`${file.name}: ${validation.error}`)
      }
    })
    
    setFiles(newFiles)
    setErrors(newErrors)
  }, [allowedTypes, maxSizeMB])
  
  const clearFiles = useCallback(() => {
    setFiles([])
    setErrors([])
    setPreviews([])
  }, [])
  
  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }, [])
  
  return {
    files,
    errors,
    previews,
    validateAndSetFiles,
    clearFiles,
    removeFile,
  }
}

/**
 * Hook for CSRF token management
 */
export function useCSRFToken() {
  const [token, setToken] = useState<string>('')
  
  useEffect(() => {
    // Generate CSRF token on mount
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    const newToken = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    setToken(newToken)
    
    // Store in sessionStorage for validation
    sessionStorage.setItem('csrf-token', newToken)
  }, [])
  
  const validateToken = useCallback((submittedToken: string): boolean => {
    const storedToken = sessionStorage.getItem('csrf-token')
    return storedToken === submittedToken
  }, [])
  
  return { token, validateToken }
}

/**
 * Hook for session timeout management
 * Automatically logs out user after inactivity
 */
export function useSessionTimeout(timeoutMinutes: number = 30, onTimeout?: () => void) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isActive, setIsActive] = useState(true)
  
  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsActive(false)
      onTimeout?.()
    }, timeoutMinutes * 60 * 1000)
  }, [timeoutMinutes, onTimeout])
  
  useEffect(() => {
    // Set initial timeout
    resetTimeout()
    
    // Reset timeout on user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    
    events.forEach(event => {
      window.addEventListener(event, resetTimeout)
    })
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      events.forEach(event => {
        window.removeEventListener(event, resetTimeout)
      })
    }
  }, [resetTimeout])
  
  return { isActive, resetTimeout }
}

/**
 * Hook for detecting and preventing clickjacking
 */
export function useClickjackingProtection() {
  useEffect(() => {
    // Check if the page is being framed
    if (window.self !== window.top) {
      // Page is in an iframe - potential clickjacking attack
      console.warn('⚠️ Clickjacking attempt detected!')
      
      // Option 1: Break out of iframe
      window.top!.location.href = window.self.location.href
      
      // Option 2: Hide content (uncomment if preferred)
      // document.body.style.display = 'none'
    }
  }, [])
}

/**
 * Hook for Content Security Policy violation reporting
 */
export function useCSPReporting() {
  useEffect(() => {
    const handleCSPViolation = (e: SecurityPolicyViolationEvent) => {
      console.error('🚨 CSP Violation:', {
        blockedURI: e.blockedURI,
        violatedDirective: e.violatedDirective,
        originalPolicy: e.originalPolicy,
      })
      
      // In production, send to logging service
      // fetch('/api/csp-report', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     blockedURI: e.blockedURI,
      //     violatedDirective: e.violatedDirective,
      //   }),
      // })
    }
    
    document.addEventListener('securitypolicyviolation', handleCSPViolation)
    
    return () => {
      document.removeEventListener('securitypolicyviolation', handleCSPViolation)
    }
  }, [])
}

/**
 * Hook for secure API calls with automatic retry and error handling
 */
export function useSecureAPI() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const securePost = useCallback(async (url: string, data: any, options: RequestInit = {}) => {
    setLoading(true)
    setError(null)
    
    try {
      // Add CSRF token
      const csrfToken = sessionStorage.getItem('csrf-token')
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
          ...options.headers,
        },
        body: JSON.stringify(data),
        ...options,
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setLoading(false)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setLoading(false)
      throw err
    }
  }, [])
  
  const secureGet = useCallback(async (url: string, options: RequestInit = {}) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        ...options,
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setLoading(false)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setLoading(false)
      throw err
    }
  }, [])
  
  return { securePost, secureGet, loading, error }
}
