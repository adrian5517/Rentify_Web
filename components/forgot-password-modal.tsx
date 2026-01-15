"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, KeyRound, CheckCircle2, Loader2, ArrowLeft } from "lucide-react"
import { requestPasswordReset, verifyOTP, resetPassword } from "@/lib/api"

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 'email' | 'otp' | 'password' | 'success'

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [genericNotice, setGenericNotice] = useState(false)
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const resetForm = () => {
    setStep('email')
    setEmail('')
    setOtp('')
    setNewPassword('')
    setConfirmPassword('')
    setResetToken('')
    setError(null)
    setIsLoading(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address')
      setIsLoading(false)
      return
    }

    try {
      await requestPasswordReset(email)
      // Show generic notice (privacy-preserving) and move to OTP step
      setGenericNotice(true)
      setStep('otp')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP'
      // If backend returns 'Email not found', treat it the same as success for privacy
      if (typeof msg === 'string' && msg.toLowerCase().includes('email not found')) {
        setGenericNotice(true)
        setStep('otp')
      } else if (typeof msg === 'string' && msg.toLowerCase().includes('undeliver')) {
        setError('Email appears invalid or undeliverable. Please use a valid email address.')
      } else {
        setError(msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await verifyOTP(email, otp)
      if (result.resetToken) {
        setResetToken(result.resetToken)
        setStep('password')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid OTP')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 8 characters long ')
      return
    }

    setIsLoading(true)

    try {
      await resetPassword(resetToken, newPassword)
      setStep('success')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="z-70 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-blue-600" />
            {step === 'email' && 'Forgot Password'}
            {step === 'otp' && 'Enter OTP'}
            {step === 'password' && 'Reset Password'}
            {step === 'success' && 'Success!'}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            {step === 'email' && "Enter your email to receive an OTP code"}
            {step === 'otp' && (genericNotice ? "If this email exists, an OTP has been sent" : `We've sent a 6-digit code to ${email}`)}
            {step === 'password' && "Create a new password for your account"}
            {step === 'success' && "Your password has been reset successfully"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Email Input */}
        {step === 'email' && (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send OTP'
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-sm font-semibold text-slate-700">
                Enter 6-Digit Code
              </Label>
              <Input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                required
                maxLength={6}
                className="text-center text-2xl tracking-widest font-mono"
                disabled={isLoading}
              />
              <p className="text-xs text-slate-500 text-center">
                Code expires in 5 minutes
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify OTP'
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep('email')}
                className="w-full"
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Email
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 'password' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-semibold text-slate-700">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="py-6 space-y-6">
            <div className="flex items-center justify-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">
                Password Reset Complete!
              </h3>
              <p className="text-sm text-slate-600">
                You can now sign in with your new password
              </p>
            </div>
            <Button
              onClick={handleClose}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Continue to Sign In
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
