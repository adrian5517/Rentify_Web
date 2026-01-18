import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect admin routes: require a token cookie. Backend still enforces role checks.
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('token')?.value
    if (!token) {
      // Only redirect to an external CLIENT_URL in production.
      // During local development prefer redirecting to the local `/auth` route
      // so the dev server receives the token fragment and can set the cookie.
      const clientUrl = process.env.CLIENT_URL && String(process.env.CLIENT_URL).replace(/\/$/, '')
      if (process.env.NODE_ENV === 'production' && clientUrl) {
        try {
          return NextResponse.redirect(`${clientUrl}/auth`)
        } catch (e) {
          // If external redirect fails, fall back to local /auth below
        }
      }

      const url = request.nextUrl.clone()
      url.pathname = '/auth'
      return NextResponse.redirect(url)
    }
  }

  const response = NextResponse.next()

  // Security Headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=()')

  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.mapbox.com",
    "worker-src 'self' blob: https://api.mapbox.com",
    "child-src 'self' blob:",
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

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  // Rate limiting headers (informational)
  const rateLimit = { limit: 100, remaining: 99, reset: Date.now() + 60000 }
  response.headers.set('X-RateLimit-Limit', String(rateLimit.limit))
  response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining))
  response.headers.set('X-RateLimit-Reset', String(rateLimit.reset))

  return response
}

// Apply middleware to specific routes: admin plus general site (excluding api/_next)
export const config = {
  matcher: ['/admin/:path*', '/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
