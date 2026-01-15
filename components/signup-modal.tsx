"use client"

import { useState } from 'react'
import config from '@/lib/config'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/auth-store'
import { Loader2, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react'

interface SignupModalProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToLogin: () => void
}

export default function SignupModal({ isOpen, onClose, onSwitchToLogin }: SignupModalProps) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const { register, loginWithFacebook, isLoading } = useAuthStore()
  const [fbLoading, setFbLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    // Password complexity is enforced: min 8 chars, at least one uppercase, one number, one symbol
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/
    const SUGGESTED_MSG = 'Password does not meet complexity requirements. It must be at least 8 characters long and include at least one uppercase letter, one number, and one symbol.'

    if (!passwordRegex.test(password)) {
      setError(SUGGESTED_MSG)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    const result = await register(username, email, password)
    
    if (result.success) {
      setSuccess(true)
      setUsername('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
    } else {
      // Map backend undeliverable message to a friendlier message
      const msg = result.error || 'Registration failed. Please try again.'
      if (typeof msg === 'string' && msg.toLowerCase().includes('undeliver')) {
        setError('Email appears invalid or undeliverable. Please use a valid email address.')
      } else {
        setError(msg)
      }
    }
  }

  const handleFacebookSignup = () => {
    // Redirect to backend Facebook OAuth endpoint with returnTo set to our origin
    const apiBase = config.API_API || 'https://rentify-server-ge0f.onrender.com'
    const returnTo = window.location?.origin || ''
    window.location.href = `${apiBase}/api/auth/facebook?returnTo=${encodeURIComponent(returnTo)}`
  }

  const handleSuccessDialogClose = () => {
    setSuccess(false)
    onClose()
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="z-60 w-[calc(100%-1rem)] sm:max-w-[425px] bg-gradient-to-br from-white to-indigo-50 border-2 border-indigo-100 max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Create Account
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600">
            Join Rentify to find your perfect home
          </DialogDescription>
        </DialogHeader>
        
        {success ? (
          <div className="py-8 space-y-4 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-green-900 mb-2">Success!</h3>
              <p className="text-gray-600">Your account has been created successfully</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 animate-in slide-in-from-top">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700 font-semibold">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Adrian Boncodin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email" className="text-gray-700 font-semibold">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password" className="text-gray-700 font-semibold">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  disabled={isLoading}
                />
              </div>
              {/* Helper + live-check */}
              <p id="pw-helper" className="text-sm text-gray-600 mt-2">Use at least 8 characters, including an uppercase letter, a number, and a symbol.</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li className={`flex items-center gap-2 ${password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                  {password.length >= 8 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>At least 8 characters</span>
                </li>
                <li className={`flex items-center gap-2 ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                  {/[A-Z]/.test(password) ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>Contains an uppercase letter (A-Z)</span>
                </li>
                <li className={`flex items-center gap-2 ${/\d/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                  {/\d/.test(password) ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>Contains a number (0-9)</span>
                </li>
                <li className={`flex items-center gap-2 ${/[^\w\s]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                  {/[^\w\s]/.test(password) ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>Contains a symbol (e.g. !@#$%)</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-gray-700 font-semibold">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  disabled={isLoading}
                />
              </div>
              {/* Live mismatch error */}
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
              disabled={isLoading || !/^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/.test(password) || password !== confirmPassword}
              aria-disabled={isLoading || !/^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/.test(password) || password !== confirmPassword}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>

            {/* Divider */}
            <div className="relative py-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gradient-to-br from-white to-indigo-50 text-gray-500 font-medium">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Facebook Signup Button */}
            <Button
              type="button"
              onClick={handleFacebookSignup}
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
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold underline"
                >
                  Login here
                </button>
              </p>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>

    {/* Success confirmation modal */}
    <Dialog open={success} onOpenChange={handleSuccessDialogClose}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <div className="w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 sm:w-12 h-10 sm:h-12 text-green-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-lg sm:text-xl md:text-2xl font-bold text-slate-900">
            Account Created! 🎉
          </DialogTitle>
          <DialogDescription className="text-center text-sm sm:text-base pt-2 sm:pt-3 text-slate-600">
            Your account has been created successfully. You can now log in.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-4 sm:pt-6 pb-1 sm:pb-2">
          <Button
            onClick={handleSuccessDialogClose}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 sm:px-10 py-5 sm:py-6 text-base sm:text-lg font-semibold"
          >
            Great — Go to Login
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
