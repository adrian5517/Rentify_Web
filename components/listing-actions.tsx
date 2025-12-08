"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import config from '@/lib/config'

export default function ListingActions({ id }: { id: string }) {
  const router = useRouter()
  const { token } = useAuthStore()
  const [deleting, setDeleting] = React.useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this listing? This cannot be undone.')) return
    setDeleting(true)
    try {
      const API_BASE = config.API_API
      const ep = `${(API_BASE || 'https://rentify-server-ge0f.onrender.com').replace(/\/$/, '')}/api/properties/${id}`
      const res = await fetch(ep, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
      if (!res || !res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(txt || 'Failed to delete listing')
      }
      router.push('/my-listings')
    } catch (err: any) {
      alert(err?.message || 'Failed to delete listing')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => router.push(`/listings/${id}/edit`)} className="px-3 py-2">
        Edit
      </Button>

      <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="px-3 py-2 flex items-center gap-2">
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
      </Button>
    </div>
  )
}
