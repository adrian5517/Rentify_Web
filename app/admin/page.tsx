"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'

export default function AdminIndex() {
  const router = useRouter()
  const { user, token } = useAuthStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => {
      if (!token || !user) {
        // Not logged in -> send to login page
        router.replace('/auth')
        return
      }
      if (user.role !== 'admin') {
        // Not an admin -> redirect to homepage
        router.replace('/')
        return
      }

      // If admin, redirect to verification dashboard
      router.replace('/admin/verification')
    }, 20)

    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="text-sm text-gray-600 mt-2">Checking authentication and redirecting to your admin dashboard…</p>
      </div>
    </div>
  )
}
