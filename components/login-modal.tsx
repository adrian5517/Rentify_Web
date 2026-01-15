"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/auth-store'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock, AlertCircle } from 'lucide-react'
import ForgotPasswordModal from './forgot-password-modal'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToSignup: () => void
}

export default function LoginModal({ isOpen, onClose, onSwitchToSignup }: LoginModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loginWithFacebook, isLoading } = useAuthStore()
  const router = useRouter()
  const [fbLoading, setFbLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleOpenForgot = () => {
    // Close the login dialog first, then open the forgot-password modal
    try {
      onClose()
    } catch (err) {
      // ignore
    }
    // small delay to allow parent/dialog state to update
    setTimeout(() => setShowForgotPassword(true), 50)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    const result = await login(email, password)

    if (result.success) {
      setEmail('')
      setPassword('')
      // If the logged-in user is an admin, redirect to admin verification dashboard
      const state = useAuthStore.getState()
      const role = state.user?.role
      try {
        if (role === 'admin') {
          // close modal then navigate
          onClose()
          router.push('/admin/verification')
        } else {
          onClose()
        }
      } catch (err) {
        onClose()
      }
    } else {
      const msg = result.error || 'Login failed. Please try again.'
      if (typeof msg === 'string' && msg.toLowerCase().includes('undeliver')) {
        setError('Email appears invalid or undeliverable. Please use a valid email address.')
      } else {
        setError(msg)
      }
    }
  }

  const handleFacebookLogin = () => {
    // Redirect to backend Facebook OAuth endpoint
    const apiBase = 'https://rentify-server-ge0f.onrender.com'
    window.location.href = `${apiBase}/api/auth/facebook`
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="z-60 w-[calc(100%-1rem)] sm:max-w-[425px] bg-gradient-to-br from-white to-blue-50 border-2 border-blue-100 max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Welcome Back
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              Login to access all features
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 animate-in slide-in-from-top">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-semibold">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-700 font-semibold">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={handleOpenForgot}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>

            {/* Divider */}
            <div className="relative py-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gradient-to-br from-white to-blue-50 text-gray-500 font-medium">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Facebook Login Button */}
            <Button
              type="button"
              onClick={handleFacebookLogin}
              disabled={fbLoading}
              className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3"
            >
              {fbLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting to Facebook...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Continue with Facebook
                </>
              )}
            </Button>

            <div className="text-center pt-2">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={onSwitchToSignup}
                  className="text-blue-600 hover:text-blue-700 font-semibold underline"
                >
                  Sign up here
                </button>
              </p>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Modal (rendered outside login Dialog so it appears on top) */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </>
  )
}
