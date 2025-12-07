"use client"

import React, { useRef, useState } from 'react'
import { uploadProfilePicture } from '@/lib/upload-client'
import { useAuthStore } from '@/lib/auth-store'

export default function ProfilePictureUploader({ onDone }: { onDone?: (user: any) => void }) {
  const { user, token } = useAuthStore()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [selected, setSelected] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(user?.profilePicture || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  const openFilePicker = () => inputRef.current?.click()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    if (!f) return setSelected(null)
    if (!f.type.startsWith('image/')) return setError('Please select an image file')
    if (f.size > 5 * 1024 * 1024) return setError('File too large (max 5MB)')
    setError(null)
    setSelected(f)

    // Create a local preview
    const reader = new FileReader()
    reader.onload = () => {
      setPreview(String(reader.result))
    }
    reader.readAsDataURL(f)
  }

  const handleCancel = () => {
    setSelected(null)
    setPreview(user?.profilePicture || null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleUpload = async () => {
    if (!selected) return
    setLoading(true)
    setError(null)
    try {
      const res = await uploadProfilePicture(selected, token || undefined, user._id)
      if (res && res.user) {
        const pic = res.user.profilePicture
        const busted = typeof pic === 'string' && pic.startsWith('http') ? `${pic}?v=${Date.now()}` : pic
        const updatedUser = { ...res.user, profilePicture: busted }
        useAuthStore.setState({ user: updatedUser })
        setPreview(busted)
        if (onDone) onDone(updatedUser)
      } else if (res && res.files) {
        const url = res.fileUrl || (res.files && res.files[0] && (res.files[0].url || res.files[0].fileUrl))
        if (url) {
          const busted = url.startsWith('http') ? `${url}?v=${Date.now()}` : url
          const updatedUser = { ...user, profilePicture: busted }
          useAuthStore.setState({ user: updatedUser })
          setPreview(busted)
          if (onDone) onDone(updatedUser)
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Upload failed')
    } finally {
      setLoading(false)
      setSelected(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="relative w-24 h-24 rounded-xl overflow-hidden border-4 border-white shadow-lg bg-white flex-shrink-0">
          <img
            src={preview || user.profilePicture || '/placeholder-user.jpg'}
            alt="Profile"
            className="w-full h-full object-cover"
          />

          <button
            type="button"
            onClick={openFilePicker}
            aria-label="Change profile picture"
            className="absolute bottom-2 right-2 bg-purple-600 hover:bg-purple-700 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-md transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3l2-3h6l2 3h3a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Profile Picture</div>
              <div className="text-xs text-slate-500">PNG, JPG, WEBP — max 5MB</div>
            </div>
            <div className="text-right text-xs text-slate-500 truncate max-w-[180px]">{selected ? selected.name : ''}</div>
          </div>

          <div className="mt-3 flex gap-2 flex-wrap items-center">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleChange}
            />

            <button
              type="button"
              onClick={openFilePicker}
              className="px-3 py-2 bg-white border rounded shadow-sm hover:bg-gray-50 flex-shrink-0"
              disabled={loading}
            >
              Choose File
            </button>

            <button
              type="button"
              onClick={handleUpload}
              disabled={!selected || loading}
              className="px-3 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 disabled:opacity-50 flex items-center flex-shrink-0"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  Uploading…
                </>
              ) : (
                'Upload'
              )}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={loading && !selected}
              className="px-3 py-2 border rounded hover:bg-gray-50 flex-shrink-0"
            >
              Cancel
            </button>
          </div>

          {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
        </div>
      </div>
    </div>
  )
}
