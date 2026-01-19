"use client"

import React, { useEffect, useState, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { useAuthStore } from '@/lib/auth-store'
import config from '@/lib/config'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import authFetch from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle2, MapPin, Home, Phone, DollarSign, FileText, Tag, X, Plus, Sparkles } from 'lucide-react'

interface EditListingFormProps {
  propertyId: string
  onSaveSuccess?: () => void
  onClose?: () => void
}

const MAX_PRICE = 50000

export default function EditListingForm({ propertyId, onSaveSuccess, onClose }: EditListingFormProps) {
  const { token } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    address: '',
    latitude: '',
    longitude: '',
    propertyType: '',
    amenities: [] as string[],
    status: 'available',
    phoneNumber: '',
  })

  const [initialData, setInitialData] = useState<any>(null)
  const [initialVerificationKeys, setInitialVerificationKeys] = useState<string[]>([])
  const [newAmenity, setNewAmenity] = useState('')
  const [verificationDocs, setVerificationDocs] = useState<Array<{ filename?: string; url?: string; _id?: string; public_id?: string; status?: string }>>([])
  const [uploadingDocs, setUploadingDocs] = useState(false)

  const getDocKey = (d: any): string | null => {
    const raw = d?._id ?? d?.id ?? d?.filename ?? d?.url
    return raw ? String(raw) : null
  }

  const API_BASE: string = config.API_API
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || mapboxgl.accessToken || 'pk.eyJ1IjoiYWRyaWFuNTUxNyIsImEiOiJjbWZkdTg4dmIwMThpMnFyNG10cWJwZjRhIn0.JLRzE6qmyDfePYgSs11ALg'

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)

  useEffect(() => {
    let mounted = true
    async function fetchProperty() {
      setLoading(true)
      setError(null)
      try {
        const ep = `${API_BASE.replace(/\/$/, '')}/api/properties/${propertyId}`
        const res = await authFetch(ep, { method: 'GET' })
        if (!res || !res.ok) throw new Error(`Fetch failed (${res?.status})`)
        const data = await res.json()

        const property = data.property || data
        if (!mounted) return

        // canonicalize propertyType so it matches our Select items (case/whitespace-insensitive)
        const availableTypes = ['Apartment','House','Condo','Studio','Townhouse','Room']
        const rawType = property.propertyType ?? ''
        const normalizedType = (() => {
          const s = String(rawType).trim()
          if (!s) return ''
          const match = availableTypes.find(t => t.toLowerCase() === s.toLowerCase())
          return match || s
        })()

        const normalized = {
          name: property.name || '',
          description: property.description || '',
          price: property.price ? String(property.price) : '',
          address: property.location?.address || property.address || '',
          latitude: String(property.location?.latitude ?? property.latitude ?? ''),
          longitude: String(property.location?.longitude ?? property.longitude ?? ''),
          propertyType: normalizedType,
          amenities: property.amenities || [],
          status: property.status || 'available',
          phoneNumber: property.phoneNumber || property.phone || '',
        }

        setFormData(normalized)
        setInitialData(normalized)
        // verification documents (owner/admin only) - normalize ids to strings
        try {
          const docsRaw = property.verification_documents || property.verificationDocuments || []
          const docs = Array.isArray(docsRaw)
              ? docsRaw.map((d: any) => ({
                  ...d,
                  _id: d?._id ? String(d._id) : (d?.id ? String(d.id) : undefined),
                  status: d?.status ?? d?.verification_status ?? 'pending'
                }))
              : []
            setVerificationDocs(docs)
            // store initial verification doc keys so we can detect changes (uploads/removals)
            try {
              const keys = docs.map((x: any) => getDocKey(x)).filter((k): k is string => Boolean(k))
              setInitialVerificationKeys(keys)
            } catch (e) { setInitialVerificationKeys([]) }
        } catch (e) { setVerificationDocs([]) }
      } catch (err: any) {
        setError(err?.message || 'Failed to load property')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchProperty()
    return () => { mounted = false }
  }, [propertyId, API_BASE, token])

  useEffect(() => {
    if (loading) return
    const lat = Number(formData.latitude) || 13.6218
    const lng = Number(formData.longitude) || 123.1815

    if (!mapContainerRef.current) return

    if (!mapRef.current) {
      try {
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: [lng, lat],
          zoom: 13
        })
        mapRef.current = map

        map.addControl(new mapboxgl.NavigationControl())

        map.on('click', (e) => {
          const { lng: clickLng, lat: clickLat } = e.lngLat
          if (markerRef.current) markerRef.current.setLngLat([clickLng, clickLat])
          else {
            markerRef.current = new mapboxgl.Marker({ draggable: true }).setLngLat([clickLng, clickLat]).addTo(map)
            markerRef.current.on('dragend', () => {
              const ll = markerRef.current!.getLngLat()
              handleChange('latitude', String(ll.lat))
              handleChange('longitude', String(ll.lng))
            })
          }
          handleChange('latitude', String(clickLat))
          handleChange('longitude', String(clickLng))
        })

        markerRef.current = new mapboxgl.Marker({ draggable: true }).setLngLat([lng, lat]).addTo(map)
        markerRef.current.on('dragend', () => {
          const ll = markerRef.current!.getLngLat()
          handleChange('latitude', String(ll.lat))
          handleChange('longitude', String(ll.lng))
        })
      } catch (e) {
        console.warn('Mapbox init failed', e)
      }
    } else {
      try {
        const map = mapRef.current!
        map.setCenter([lng, lat])
        if (markerRef.current) markerRef.current.setLngLat([lng, lat])
      } catch (e) { }
    }
  }, [loading, formData.latitude, formData.longitude])

  const handleChange = (field: string, value: any) => {
    setFormData((p) => ({ ...p, [field]: value }))
  }

  const addAmenity = (amenity: string) => {
    const a = amenity?.trim()
    if (!a) return
    setFormData((prev) => {
      if (prev.amenities.includes(a)) return prev
      return { ...prev, amenities: [...prev.amenities, a] }
    })
    setNewAmenity('')
  }

  const removeAmenity = (amenity: string) => {
    setFormData((prev) => ({ ...prev, amenities: prev.amenities.filter((x) => x !== amenity) }))
  }

  const hasChanges = () => {
    if (!initialData) return false
    // compare main form fields
    const baseChanged = JSON.stringify(initialData) !== JSON.stringify(formData)
    // compare verification docs by normalized keys
    try {
      const currentKeys = verificationDocs.map(getDocKey).filter((k): k is string => Boolean(k))
      const initialKeys = initialVerificationKeys || []
      const keysChanged = currentKeys.length !== initialKeys.length || initialKeys.some(k => !currentKeys.includes(k))
      return baseChanged || keysChanged
    } catch (e) {
      return baseChanged
    }
  }

  const priceNumber = Number(formData.price || 0)
  const isPriceValid = !isNaN(priceNumber) && priceNumber > 0 && priceNumber <= MAX_PRICE

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)
    try {
      if (!isPriceValid) throw new Error(`Price must be at most ₱${MAX_PRICE.toLocaleString()}`)

      const body = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price || 0),
        address: formData.address,
        latitude: formData.latitude !== '' ? Number(formData.latitude) : undefined,
        longitude: formData.longitude !== '' ? Number(formData.longitude) : undefined,
        propertyType: formData.propertyType,
        amenities: formData.amenities,
        status: formData.status,
        phoneNumber: formData.phoneNumber,
      }

      const endpoint = `${API_BASE.replace(/\/$/, '')}/api/properties/${propertyId}`

      const res = await authFetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await (res.text().then(t => {
        try { return JSON.parse(t) } catch { return { success: res.ok, message: t } }
      }))

      if (!res.ok || !data.success) {
        throw new Error(data.message || `Update failed (${res.status})`)
      }

      setSuccessMessage('Listing updated successfully')
      setInitialData(formData)

      try {
        if (onSaveSuccess) onSaveSuccess()
      } catch (e) { }
    } catch (err: any) {
      setError(err?.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-4 sm:p-8 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="animate-spin h-10 w-10 text-violet-600 mx-auto mb-4" />
        <p className="text-violet-700 font-medium">Loading your property...</p>
      </div>
    </div>
  )

  if (error && !formData.name) return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 p-4 sm:p-8">
      <Card className="max-w-2xl mx-auto border-2 border-red-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-red-500 to-pink-500 text-white">
          <CardTitle className="flex items-center gap-2">
            <X className="h-5 w-5" />
            Error Loading Property
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 py-4 sm:py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <Card className="shadow-2xl border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white py-6 sm:py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" />
                <CardTitle className="text-xl sm:text-2xl font-bold">Edit Property Listing</CardTitle>
              </div>
              <div>
                <button
                  onClick={() => { try { if (onClose) onClose() } catch (e) {} }}
                  className="text-sm text-white bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md"
                >
                  Close
                </button>
              </div>
            </div>
            <p className="text-violet-100 text-sm mt-2">Update your property details with ease</p>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-8">
            {successMessage && (
              <div className="p-4 mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="text-green-600 h-6 w-6 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-green-900">{successMessage}</p>
                      <p className="text-sm text-green-700 mt-1">Your changes have been saved successfully.</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <button
                      type="button"
                      aria-label="Dismiss success message"
                      onClick={() => setSuccessMessage(null)}
                      className="text-green-800 hover:text-green-600 rounded-md p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 mb-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-xl shadow-sm">
                <div className="flex items-start gap-3">
                  <X className="text-red-600 h-6 w-6 mt-0.5 flex-shrink-0" />
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Property Name & Price */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-violet-900 flex items-center gap-2">
                    <Home className="h-4 w-4 text-violet-600" />
                    Property Name
                  </Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="border-violet-200 focus:border-violet-500 focus:ring-violet-500 h-11"
                    placeholder="e.g., Sunset View Apartment"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-violet-900 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-violet-600" />
                    Monthly Rent (₱)
                  </Label>
                  <Input 
                    type="number" 
                    value={formData.price} 
                    onChange={(e) => handleChange('price', e.target.value)}
                    className={`h-11 ${!isPriceValid && formData.price !== '' ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-violet-200 focus:border-violet-500 focus:ring-violet-500'}`}
                    placeholder="Enter monthly rent"
                  />
                  {!isPriceValid && formData.price !== '' && (
                    <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                      <X className="h-3 w-3" />
                      Price must be at most ₱{MAX_PRICE.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-violet-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-violet-600" />
                  Address
                </Label>
                <Input 
                  value={formData.address} 
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="border-violet-200 focus:border-violet-500 focus:ring-violet-500 h-11"
                  placeholder="Enter full address"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-violet-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-violet-600" />
                  Description
                </Label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={5}
                  className="border-violet-200 focus:border-violet-500 focus:ring-violet-500 resize-none"
                  placeholder="Describe your property in detail..."
                />
              </div>

              {/* Property Type & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-violet-900 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-violet-600" />
                    Property Type
                  </Label>
                  <Select value={formData.propertyType} onValueChange={(v) => handleChange('propertyType', v)}>
                    <SelectTrigger className="h-11 border-violet-200 focus:border-violet-500 focus:ring-violet-500">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {['Apartment','House','Condo','Studio','Townhouse','Room'].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-violet-900 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-violet-600" />
                    Contact Phone
                  </Label>
                  <Input 
                    value={formData.phoneNumber} 
                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                    className="border-violet-200 focus:border-violet-500 focus:ring-violet-500 h-11"
                    placeholder="+63 XXX XXX XXXX"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-violet-900">Status</Label>
                  <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                    <SelectTrigger className="h-11 border-violet-200 focus:border-violet-500 focus:ring-violet-500">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { value: 'available', label: 'Available' },
                        { value: 'For rent', label: 'For Rent' },
                        { value: 'For sale', label: 'For Sale' },
                        { value: 'fully booked', label: 'Fully Booked' },
                        { value: 'Rented', label: 'Rented' },
                      ].map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-violet-900">Amenities</Label>
                <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border-2 border-violet-200">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.amenities && formData.amenities.length > 0 ? (
                      formData.amenities.map((a, idx) => (
                        <div key={idx} className="group px-4 py-2 bg-white border-2 border-violet-300 rounded-full text-sm font-medium text-violet-900 flex items-center gap-2 hover:bg-violet-100 transition-colors shadow-sm">
                          <span>{a}</span>
                          <button 
                            onClick={() => removeAmenity(a)} 
                            className="text-violet-600 hover:text-red-600 transition-colors"
                            aria-label="Remove amenity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-violet-600 italic">No amenities added yet</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="new-amenity-input"
                      placeholder="Add amenity (e.g., WiFi, Parking)"
                      className="flex-1 border-violet-300 focus:border-violet-500 focus:ring-violet-500 h-11"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const val = (e.target as HTMLInputElement).value.trim()
                          if (val) { addAmenity(val); (e.target as HTMLInputElement).value = '' }
                        }
                      }}
                    />
                    <Button 
                      onClick={() => {
                        const el = document.getElementById('new-amenity-input') as HTMLInputElement | null
                        const val = el?.value.trim() || ''
                        if (val) { addAmenity(val); if (el) el.value = '' }
                      }}
                      className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 h-11 px-6"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* Map Section */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-violet-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-violet-600" />
                  Location (Click map or drag marker)
                </Label>
                <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border-2 border-violet-200">
                  <div ref={mapContainerRef} className="w-full h-64 sm:h-80 lg:h-96 rounded-lg overflow-hidden border-2 border-violet-300 shadow-lg" />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-violet-900">Latitude</Label>
                      <Input 
                        value={formData.latitude} 
                        onChange={(e) => handleChange('latitude', e.target.value)}
                        className="border-violet-300 focus:border-violet-500 focus:ring-violet-500 h-10"
                        placeholder="e.g., 13.6218"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-violet-900">Longitude</Label>
                      <Input 
                        value={formData.longitude} 
                        onChange={(e) => handleChange('longitude', e.target.value)}
                        className="border-violet-300 focus:border-violet-500 focus:ring-violet-500 h-10"
                        placeholder="e.g., 123.1815"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons (moved below verification upload) - kept in component scope */}

              {/* Verification Documents */}
              <div className="mt-6">
                <Label className="text-sm font-semibold text-violet-900 flex items-center gap-2">Verification Documents</Label>
                <p className="text-sm text-slate-600 mb-3">Upload government IDs or ownership documents. These files are private and only visible to you and admins.</p>

                <div className="space-y-3">
                  {verificationDocs && verificationDocs.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {verificationDocs.map((d, idx) => (
                        <div key={getDocKey(d) || d.filename || idx} className="p-3 bg-white border rounded-md flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-violet-600" />
                            <div>
                              <div className="flex items-center gap-3">
                                <div className="text-sm font-medium text-slate-900">{d.filename || (d.url ? d.url.split('/').pop() : 'Document')}</div>
                                <div>
                                  {d.status && (
                                    <span className={"text-xs font-semibold px-2 py-0.5 rounded-full " + (d.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : d.status === 'rejected' ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-yellow-50 text-yellow-800 border border-yellow-100')}>{String(d.status).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                                  )}
                                </div>
                              </div>
                              {d.url && <a className="text-xs text-blue-600 underline" href={d.url} target="_blank" rel="noreferrer">Open</a>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={async () => {
                              const confirm = await Swal.fire({ title: 'Remove document?', text: 'This will remove the document from the listing. Continue?', icon: 'warning', showCancelButton: true })
                              if (!confirm.isConfirmed) return
                              try {
                                const ep = `${API_BASE.replace(/\/$/, '')}/api/properties/${propertyId}/verification/docs`
                                const res = await authFetch(ep, {
                                  method: 'DELETE',
                                  headers: {
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({ filename: d.filename, url: d.url, id: d._id })
                                })
                                if (!res || !res.ok) throw new Error('Failed to remove document')
                                const keyToRemove = getDocKey(d)
                                setVerificationDocs(prev => prev.filter(x => {
                                  const key = getDocKey(x)
                                  // keep items whose key differs from the removed key
                                  return key !== keyToRemove
                                }))
                                await Swal.fire({ icon: 'success', title: 'Removed', text: 'Document removed.' })
                              } catch (err: any) {
                                console.error('Remove doc failed', err)
                                await Swal.fire({ icon: 'error', title: 'Error', text: err?.message || 'Failed to remove document' })
                              }
                            }}>
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-md text-yellow-800">No verification documents uploaded yet.</div>
                  )}

                  <div className="mt-3">
                    <input id="verification-files-input" type="file" multiple accept="image/*,.pdf" className="block w-full" />
                    <div className="flex gap-2 mt-2">
                      <Button onClick={async () => {
                        const el = document.getElementById('verification-files-input') as HTMLInputElement | null
                        // if the input doesn't exist, inform the user
                        if (!el) {
                          await Swal.fire({ icon: 'info', title: 'Upload unavailable', text: 'File input not found.' })
                          return
                        }
                        // if no files selected, open the file picker to prompt the user
                        if (!el.files || el.files.length === 0) {
                          el.click()
                          return
                        }
                        const files = Array.from(el.files)
                        setUploadingDocs(true)
                        try {
                          const ep = `${API_BASE.replace(/\/$/, '')}/api/properties/${propertyId}/verification/docs`
                          const fd = new FormData()
                          files.forEach(f => fd.append('docs', f))
                          const res = await authFetch(ep, { method: 'POST', body: fd })
                          if (!res || !res.ok) throw new Error(`Upload failed (${res?.status})`)
                          const rdata = await res.json()
                          // Expect backend to return the saved documents
                          const added = rdata.docs || rdata.added || rdata.verification_documents || []
                          const addedArr = Array.isArray(added) ? added : (added ? [added] : [])
                          setVerificationDocs(prev => {
                            // Build a set of existing keys (normalized to strings)
                            const existingKeysArr = prev
                              .map(x => {
                                const raw = x._id ?? (x as any).id ?? x.filename ?? x.url
                                return raw ? String(raw) : null
                              })
                              .filter((k): k is string => Boolean(k))

                            const existingKeys = new Set(existingKeysArr)

                            // Normalize added items and filter duplicates against existingKeys
                            const mappedAdded = addedArr
                              .map(a => {
                                  const raw = a._id ?? a.id ?? a.filename ?? a.url
                                  if (!raw) return null
                                  // normalize returned item: ensure _id string and default status
                                  const item = {
                                    ...a,
                                    _id: a?._id ? String(a._id) : (a?.id ? String(a.id) : undefined),
                                    status: a?.status ?? a?.verification_status ?? 'pending'
                                  }
                                  return { key: String(raw), item }
                                })
                              .filter((v): v is { key: string; item: any } => v !== null)

                            const filteredToAdd = mappedAdded
                              .filter(m => !existingKeys.has(m.key))
                              .map(m => m.item)

                            return [...prev, ...filteredToAdd]
                          })
;
                          (el as HTMLInputElement).value = ''
                          // show both in-page banner and modal indicating pending verification
                          setSuccessMessage('Verification documents uploaded — waiting for admin verification.')
                          await Swal.fire({ icon: 'success', title: 'Uploaded', text: 'Verification documents uploaded — waiting for admin verification.' })
                        } catch (err: any) {
                          console.error('Upload docs error', err)
                          await Swal.fire({ icon: 'error', title: 'Upload failed', text: err?.message || 'Failed to upload documents' })
                        } finally {
                          setUploadingDocs(false)
                        }
                      }} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">{uploadingDocs ? 'Uploading...' : 'Upload Documents'}</Button>
                    </div>
                    {/* Move Save/Reset buttons here so they appear at the bottom of the upload area */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 mt-4">
                      <Button 
                        disabled={saving || !hasChanges() || !isPriceValid} 
                        onClick={handleSave}
                        className="flex-1 sm:flex-initial bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white font-semibold h-12 px-8 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin mr-2" /> 
                            Saving Changes...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-5 w-5 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => { setFormData(initialData); setError(null); setSuccessMessage(null); }}
                        className="flex-1 sm:flex-initial border-2 border-violet-300 text-violet-700 hover:bg-violet-50 h-12 px-8 font-semibold"
                      >
                        Reset Form
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}