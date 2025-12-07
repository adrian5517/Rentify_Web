"use client"

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, Trash2, Save, Upload, X } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import config from '@/lib/config'

export default function EditListingPage() {
  const params = useParams() as { id?: string }
  const router = useRouter()
  const { id } = params || {}
  const { token } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [property, setProperty] = useState<any>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [newAmenity, setNewAmenity] = useState('')

  const API_BASE = config.API_API

  useEffect(() => {
    if (!id) return
    const fetchProperty = async () => {
      setLoading(true)
      setError(null)
      try {
        const ep = `${API_BASE.replace(/\/$/, '')}/api/properties/${id}`
        const res = await fetch(ep, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        })
        if (!res || !res.ok) throw new Error('Failed to load property')
        const data = await res.json()
        const prop = Array.isArray(data) ? data[0] : (data.property || data || null)
        setProperty(prop)
        // load image previews if present
        try {
          const imgs = prop?.images || prop?.photos || []
          if (Array.isArray(imgs) && imgs.length > 0) setImagePreviews(imgs)
        } catch (e) {
          // ignore
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load property')
      } finally {
        setLoading(false)
      }
    }

    fetchProperty()
  }, [id, token, API_BASE])

  const handleUpdate = async () => {
    if (!property) return
    setSaving(true)
    setError(null)
    try {
      const ep = `${API_BASE.replace(/\/$/, '')}/api/properties/${id}`
      let res: Response | null = null
      // Use FormData to allow image uploads
      const fd = new FormData()
      fd.append('name', property.name || '')
      fd.append('description', property.description || '')
      fd.append('price', String(property.price || '0'))
      fd.append('address', (property.location && property.location.address) || property.address || '')
      if (property.latitude) fd.append('latitude', String(property.latitude))
      if (property.longitude) fd.append('longitude', String(property.longitude))
      if (Array.isArray(property.amenities)) {
        property.amenities.forEach((a: string) => fd.append('amenities', a))
      }

      // Append image files (new uploads)
      for (const file of imageFiles) {
        fd.append('images', file)
      }

      try {
        res = await fetch(ep, {
          method: 'PUT',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
            // do NOT set Content-Type for FormData
          },
          body: fd
        })
      } catch (e) {
        // network error
      }

      if (!res || !res.ok) {
        const text = await (res ? res.text() : Promise.resolve('No response'))
        throw new Error(text || 'Failed to update property')
      }

      // success -> go back to My Listings
      router.push('/my-listings')
    } catch (err: any) {
      setError(err?.message || 'Failed to update property')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this property? This cannot be undone.')) return
    setSaving(true)
    try {
      const delEp = `${API_BASE.replace(/\/$/, '')}/api/properties/${id}`
      let res: Response | null = null
      try {
        res = await fetch(delEp, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        })
      } catch (e) {
        // network error
      }
      if (!res || !res.ok) throw new Error('Failed to delete property')
      router.push('/my-listings')
    } catch (err: any) {
      setError(err?.message || 'Failed to delete property')
    } finally {
      setSaving(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newFiles = Array.from(files)
    setImageFiles(prev => [...prev, ...newFiles])
    // create previews
    const newPreviews = Array.from(files).map(f => URL.createObjectURL(f))
    setImagePreviews(prev => [...prev, ...newPreviews])
    // reset input
    e.currentTarget.value = ''
  }

  const removeImageAt = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
    setImageFiles(prev => prev.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Listing not found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">We couldn't find that listing. It may have been removed.</p>
            <div className="mt-4">
              <Button onClick={() => router.push('/my-listings')}>Back to My Listings</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Listing</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Property Name</Label>
              <Input id="name" value={property.name || ''} onChange={(e) => setProperty({ ...property, name: e.target.value })} />
            </div>

            <div>
              <Label htmlFor="price">Monthly Price (₱)</Label>
              <Input id="price" type="number" value={property.price || ''} onChange={(e) => setProperty({ ...property, price: Number(e.target.value) })} />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={(property.location && property.location.address) || property.address || ''} onChange={(e) => setProperty({ ...property, location: { ...(property.location || {}), address: e.target.value } })} />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={property.description || ''} onChange={(e) => setProperty({ ...property, description: e.target.value })} />
            </div>

            <div>
              <Label>Images</Label>
              <div className="flex items-center gap-3 flex-wrap">
                {imagePreviews.map((src, idx) => (
                  <div key={idx} className="relative w-28 h-20 bg-slate-100 rounded overflow-hidden">
                    <img src={src} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImageAt(idx)} className="absolute top-1 right-1 bg-white rounded-full p-1 shadow">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border cursor-pointer">
                  <Upload className="w-4 h-4 text-slate-600" />
                  <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                  <span className="text-sm text-slate-600">Add photos</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleUpdate} disabled={saving} className="flex items-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={saving} className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
              <Button onClick={() => router.push('/my-listings')}>Cancel</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
