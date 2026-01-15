"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function AuthRedirect() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Signing in with Facebook...')

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Get token from URL fragment (#token=...) or query string (?token=...)
        const hash = (window.location.hash || '').replace(/^#/, '')
        const hashParams = new URLSearchParams(hash)
        const searchParams = new URLSearchParams(window.location.search || '')
        const token = hashParams.get('token') || searchParams.get('token') || null

        if (!token) {
          // Provide more helpful guidance in logs for debugging
          console.warn('Auth redirect landed on /auth but no token found. url=', window.location.href)
          setStatus('error')
          setMessage('Authentication failed: No token received')
          setTimeout(() => router.push('/'), 3000)
          return
        }

        // Save token to auth store
        const apiBase = (await import('@/lib/config')).default.API_API || 'https://rentify-server-ge0f.onrender.com'

        // Fetch user data with the token
        const response = await fetch(`${apiBase}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch user data')
        }

        const data = await response.json()

        // Store token and user in Zustand
        useAuthStore.setState({
          token,
          user: data.user,
          profilePicture: data.user.profilePicture || null
        })

        try {
          // Mirror token into a cookie so Next middleware can detect it
          document.cookie = `token=${token}; path=/`;
        } catch (e) {
          // ignore in non-browser environments
        }

        setStatus('success')
        setMessage('Successfully signed in!')

        // Redirect based on role: admins -> admin dashboard
        const isAdmin = data.user?.role === 'admin'
        setTimeout(() => {
          router.push(isAdmin ? '/admin/verification' : '/')
        }, 1200)

      } catch (error) {
        console.error('Facebook auth error:', error)
        setStatus('error')
        setMessage(error instanceof Error ? error.message : 'Authentication failed')
        
        // Redirect to home after 3 seconds
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }
    }

    handleAuth()
  }, [router, setUser])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-md w-full">
        <div className="flex flex-col items-center space-y-6">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Signing In</h2>
                <p className="text-gray-600">{message}</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-green-900 mb-2">Success!</h2>
                <p className="text-gray-600">{message}</p>
                <p className="text-sm text-gray-500 mt-2">Redirecting you to the app...</p>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-red-900 mb-2">Authentication Failed</h2>
                <p className="text-gray-600">{message}</p>
                <p className="text-sm text-gray-500 mt-2">Redirecting you back...</p>
              </div>
            </>
          )}

          {/* Facebook branding */}
          <div className="pt-4 border-t border-gray-200 w-full">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
