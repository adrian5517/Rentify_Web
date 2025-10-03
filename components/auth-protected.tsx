"use client"

import { useAuthStore } from '@/lib/auth-store'
import { ReactNode } from 'react'
import { Lock } from 'lucide-react'

interface AuthProtectedProps {
  children: ReactNode
  fallback?: ReactNode
}

export default function AuthProtected({ children, fallback }: AuthProtectedProps) {
  const { user } = useAuthStore()

  if (!user) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[400px] bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl border-2 border-slate-200">
          <div className="text-center p-8 max-w-md">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Lock className="w-10 h-10 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">
              Authentication Required
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              Please log in or sign up to access this feature. Create an account to unlock property listings, messaging, analytics, and more!
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
              <span className="text-sm font-medium">👆 Use the Login or Sign Up button above</span>
            </div>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}
