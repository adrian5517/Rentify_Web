import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security Headers
  
  // Prevent clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Frame-Options', 'DENY')
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Referrer Policy - only send origin for cross-origin requests
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions Policy - restrict potentially dangerous features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=()'
  )
  
  // Content Security Policy
  // Note: Adjust these directives based on your actual needs
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.mapbox.com",
    "style-src 'self' 'unsafe-inline' https://api.mapbox.com https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: https://api.mapbox.com https://rentify-server-ge0f.onrender.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://api.mapbox.com https://events.mapbox.com wss://*.tiles.mapbox.com https://rentify-server-ge0f.onrender.com wss://rentify-server-ge0f.onrender.com",
    "frame-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', cspDirectives)
  
  // Strict Transport Security - force HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }
  
  // Rate limiting headers (informational)
  const rateLimit = {
    limit: 100,
    remaining: 99,
    reset: Date.now() + 60000,
  }
  response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString())
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
  response.headers.set('X-RateLimit-Reset', rateLimit.reset.toString())

  return response
}

// Apply middleware to all routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
