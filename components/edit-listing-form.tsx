"use client"

import React, { useEffect, useState, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { useAuthStore } from '@/lib/auth-store'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle2 } from 'lucide-react'

interface EditListingFormProps {
  propertyId: string
}

const MAX_PRICE = 50000

export default function EditListingForm({ propertyId }: EditListingFormProps) {
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
    phoneNumber: '',
  })

  const [initialData, setInitialData] = useState<any>(null)

  const API_BASE: string = (process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/$/, '')
  // Mapbox token fallback
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
        const endpoints = [
          `/api/properties/${propertyId}`,
          `${API_BASE}/api/properties/${propertyId}`
        ]

        let res: Response | null = null
        let data: any = null
        for (const ep of endpoints) {
          try {
            res = await fetch(ep)
            if (!res.ok) continue
            data = await res.json()
            break
          } catch (e) {
            // try next
          }
        }

        if (!res || !res.ok) throw new Error('Failed to fetch property')

        const property = data.property || data
        if (!mounted) return

        const normalized = {
          name: property.name || '',
          description: property.description || '',
          price: property.price ? String(property.price) : '',
          address: property.location?.address || property.address || '',
          latitude: String(property.location?.latitude ?? property.latitude ?? ''),
          longitude: String(property.location?.longitude ?? property.longitude ?? ''),
          propertyType: property.propertyType || '',
          amenities: property.amenities || [],
          phoneNumber: property.phoneNumber || property.phone || '',
        }

        setFormData(normalized)
        setInitialData(normalized)
      } catch (err: any) {
        setError(err?.message || 'Failed to load property')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchProperty()
    return () => { mounted = false }
  }, [propertyId, API_BASE])

  // Initialize map and marker after data is loaded
  useEffect(() => {
    if (loading) return
    // ensure we have numeric coordinates or use default center
    const lat = Number(formData.latitude) || 13.6218
    const lng = Number(formData.longitude) || 123.1815

    if (!mapContainerRef.current) return

    // Create map only once
    if (!mapRef.current) {
      try {
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: [lng, lat],
          zoom: 13
        })
        mapRef.current = map

        // add controls
        map.addControl(new mapboxgl.NavigationControl())

        map.on('click', (e) => {
          const { lng: clickLng, lat: clickLat } = e.lngLat
          // move marker
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

        // create marker
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
      // update center/marker position
      try {
        const map = mapRef.current!
        map.setCenter([lng, lat])
        if (markerRef.current) markerRef.current.setLngLat([lng, lat])
      } catch (e) { }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, formData.latitude, formData.longitude])

  const handleChange = (field: string, value: any) => {
    setFormData((p) => ({ ...p, [field]: value }))
  }

  const hasChanges = () => {
    if (!initialData) return false
    return JSON.stringify(initialData) !== JSON.stringify(formData)
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
        phoneNumber: formData.phoneNumber,
      }

      const endpoint = API_BASE ? `${API_BASE}/api/properties/${propertyId}` : `/api/properties/${propertyId}`

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    } catch (err: any) {
      setError(err?.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center">
      <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
    </div>
  )

  if (error) return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardTitle className="text-lg">Edit Listing</CardTitle>
        </CardHeader>
        <CardContent>
          {successMessage && (
            <div className="p-3 mb-4 bg-green-50 border border-green-200 rounded">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="text-green-600 h-5 w-5 mt-0.5" />
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold">Property Name</Label>
              <Input value={formData.name} onChange={(e) => handleChange('name', e.target.value)} />
            </div>

            <div>
              <Label className="text-xs font-semibold">Monthly Rent (₱)</Label>
              <Input type="number" value={formData.price} onChange={(e) => handleChange('price', e.target.value)} />
              {!isPriceValid && formData.price !== '' && (
                <p className="text-xs text-red-600 mt-1">Price must be at most ₱{MAX_PRICE.toLocaleString()}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label className="text-xs font-semibold">Address</Label>
              <Input value={formData.address} onChange={(e) => handleChange('address', e.target.value)} />
            </div>

            <div className="md:col-span-2">
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)} rows={4} />
            </div>

            <div>
              <Label className="text-xs font-semibold">Property Type</Label>
              <Select value={formData.propertyType} onValueChange={(v) => handleChange('propertyType', v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {['Apartment','House','Condo','Studio','Townhouse','Room'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Contact Phone</Label>
              <Input value={formData.phoneNumber} onChange={(e) => handleChange('phoneNumber', e.target.value)} />
            </div>
          </div>

          {/* Map + Coordinates Editor */}
          <div className="md:col-span-2 mt-6">
            <Label className="text-xs font-semibold mb-2">Location (click map or drag marker)</Label>
            <div ref={mapContainerRef} className="w-full h-64 rounded-lg overflow-hidden border border-slate-200" />

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <Label className="text-xs font-semibold">Latitude</Label>
                <Input value={formData.latitude} onChange={(e) => handleChange('latitude', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs font-semibold">Longitude</Label>
                <Input value={formData.longitude} onChange={(e) => handleChange('longitude', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <Button disabled={saving || !hasChanges() || !isPriceValid} onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-indigo-600">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
                </>
              ) : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => { setFormData(initialData); setError(null); setSuccessMessage(null); }}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
