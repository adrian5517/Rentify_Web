"use client"

import React, { useState } from 'react'
import { uploadProfilePicture } from '@/lib/upload-client'
import { useAuthStore } from '@/lib/auth-store'

export default function ProfilePictureUploader({ onDone }: { onDone?: (user: any) => void }) {
  const { user, token } = useAuthStore()
  const [selected, setSelected] = useState<File | null>(null)
  const [profilePicture, setProfilePicture] = useState<string | null>(user?.profilePicture || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    if (!f) return setSelected(null)
    if (!f.type.startsWith('image/')) return setError('Please select an image file')
    if (f.size > 5 * 1024 * 1024) return setError('File too large (max 5MB)')
    setError(null)
    setSelected(f)
  }

  const handleUpload = async () => {
    if (!selected) return
    setLoading(true)
    setError(null)
    try {
      const res = await uploadProfilePicture(selected, token || undefined, user._id)
      // If the server returned updated user object, update store
      if (res && res.user) {
        // Use cache-busting to force browser to fetch the new image
        const pic = res.user.profilePicture
        const busted = typeof pic === 'string' && pic.startsWith('http') ? `${pic}?v=${Date.now()}` : pic
        const updatedUser = { ...res.user, profilePicture: busted }
        useAuthStore.setState({ user: updatedUser })
        setProfilePicture(busted)
        if (onDone) onDone(updatedUser)
      } else if (res && res.files) {
        // if upload-only returned files, update profile locally (client might need to call profile update separately)
        const url = res.fileUrl || (res.files && res.files[0] && (res.files[0].url || res.files[0].fileUrl))
        if (url) {
          const busted = url.startsWith('http') ? `${url}?v=${Date.now()}` : url
          const updatedUser = { ...user, profilePicture: busted }
          useAuthStore.setState({ user: updatedUser })
          setProfilePicture(busted)
          if (onDone) onDone(updatedUser)
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Upload failed')
    } finally {
      setLoading(false)
      setSelected(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <img src={profilePicture || user.profilePicture || '/placeholder-user.jpg'} alt="profile" className="w-12 h-12 rounded-full object-cover" />
        <div>
          <label className="text-sm font-medium">Profile Picture</label>
          <div className="text-xs text-slate-500">PNG, JPG, WEBP — max 5MB</div>
        </div>
      </div>

      <input type="file" accept="image/*" onChange={handleChange} />

      {error && <div className="text-xs text-red-600">{error}</div>}

      <div className="flex gap-2">
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
          onClick={handleUpload}
          disabled={!selected || loading}
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
        <button className="px-3 py-1 border rounded" onClick={() => setSelected(null)} disabled={loading}>Cancel</button>
      </div>
    </div>
  )
}
