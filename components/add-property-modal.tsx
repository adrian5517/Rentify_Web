"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X, Upload, MapPin, Home, DollarSign, FileText, Camera, Tag, Loader2, Navigation, CheckCircle2 } from "lucide-react"
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface AddPropertyModalProps {
  isOpen: boolean
  onClose: () => void
  onPropertyAdded?: () => void
}

// Helper function to get auth token
const getAuthToken = (): string | null => {
  try {
    const authData = localStorage.getItem('auth-storage')
    if (authData) {
      const parsed = JSON.parse(authData)
      return parsed.state?.token || null
    }
    return null
  } catch (error) {
    console.error('Error getting auth token:', error)
    return null
  }
}

// Helper function to get current user ID
const getCurrentUserId = (): string | null => {
  try {
    const authData = localStorage.getItem('auth-storage')
    if (authData) {
      const parsed = JSON.parse(authData)
      return parsed.state?.user?._id || null
    }
    return null
  } catch (error) {
    console.error('Error getting user ID:', error)
    return null
  }
}

// Helper function to get current user info
const getCurrentUserInfo = (): { id: string; fullname: string; email: string } | null => {
  try {
    const authData = localStorage.getItem('auth-storage')
    console.log('🔍 Auth data from localStorage:', authData)
    if (authData) {
      const parsed = JSON.parse(authData)
      console.log('🔍 Parsed auth data:', parsed)
      const user = parsed.state?.user
      console.log('🔍 User object:', user)
      if (user) {
        const userInfo = {
          id: user._id || user.id || '',
          fullname: user.fullname || user.name || user.fullName || user.username || 'Unknown User',
          email: user.email || 'No email'
        }
        console.log('✅ Returning user info:', userInfo)
        return userInfo
      }
    }
    return null
  } catch (error) {
    console.error('Error getting user info:', error)
    return null
  }
}

export default function AddPropertyModal({ isOpen, onClose, onPropertyAdded }: AddPropertyModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    address: "",
    latitude: "",
    longitude: "",
    propertyType: "",
    images: [] as string[],
    amenities: [] as string[],
    phoneNumber: "",
  })

  // Store actual File objects for upload
  const [imageFiles, setImageFiles] = useState<File[]>([])

  const [newAmenity, setNewAmenity] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; fullname: string; email: string } | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)

  const propertyTypes = ["Apartment", "House", "Condo", "Studio", "Townhouse", "Room"]
  const commonAmenities = [
    "WiFi",
    "Air Conditioning",
    "Parking",
    "Swimming Pool",
    "Gym",
    "Security",
    "Laundry",
    "Balcony",
    "Garden",
    "Elevator",
    "Pet Friendly",
    "Furnished",
  ]

  // Load user info when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('📋 Modal opened, loading user info...')
      const userInfo = getCurrentUserInfo()
      console.log('📋 User info loaded:', userInfo)
      setCurrentUser(userInfo)
    }
  }, [isOpen])

  // Initialize map when modal opens
  useEffect(() => {
    if (isOpen && !mapRef.current) {
      console.log('🎯 Modal opened, checking map container...')
      console.log('📦 mapContainerRef.current:', mapContainerRef.current)
      
      // Wait for container to be ready
      const checkContainer = () => {
        if (mapContainerRef.current) {
          console.log('✅ Container found, initializing map')
          initializeMap()
        } else {
          console.log('⏳ Container not ready, retrying...')
          setTimeout(checkContainer, 100)
        }
      }
      
      // Start checking after a small delay
      const timer = setTimeout(checkContainer, 100)
      
      return () => clearTimeout(timer)
    }

    // Cleanup map on modal close
    if (!isOpen && mapRef.current) {
      console.log('🧹 Cleaning up map')
      mapRef.current.remove()
      mapRef.current = null
      markerRef.current = null
      setMapLoaded(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const initializeMap = () => {
    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
    
    if (!accessToken) {
      console.error('❌ Mapbox access token not found')
      setMapLoaded(true) // Hide loading spinner
      return
    }

    if (!mapContainerRef.current) {
      console.error('❌ Map container not found')
      return
    }

    try {
      // Set Mapbox access token
      mapboxgl.accessToken = accessToken

      // Default center: Naga City, Philippines
      const defaultLng = 123.1815
      const defaultLat = 13.6218

      console.log('🗺️ Creating map instance...')

      // Create basic map
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [defaultLng, defaultLat],
        zoom: 13,
        attributionControl: true,
        logoPosition: 'bottom-right'
      })

      // Save map ref immediately
      mapRef.current = map

      console.log('📏 Map container size:', mapContainerRef.current.clientWidth, 'x', mapContainerRef.current.clientHeight)

      // Add controls before load event (they'll be ready when map loads)
      map.addControl(new mapboxgl.NavigationControl(), 'top-right')

      // Wait for map to load before creating marker
      map.on('load', () => {
        console.log('✅ Map loaded successfully!')
        
        // Resize map to ensure proper rendering
        setTimeout(() => {
          if (map && mapRef.current) {
            map.resize()
            console.log('📐 Map resized')
          }
        }, 100)
        
        // Create marker after map loads
        const marker = new mapboxgl.Marker({
          draggable: true,
          color: '#3b82f6'
        })
          .setLngLat([defaultLng, defaultLat])
          .addTo(map)

        markerRef.current = marker
        console.log('📍 Marker created and added')

        // Update coordinates when marker is dragged
        marker.on('dragend', () => {
          const lngLat = marker.getLngLat()
          setFormData(prev => ({
            ...prev,
            latitude: lngLat.lat.toFixed(6),
            longitude: lngLat.lng.toFixed(6)
          }))
          console.log('📍 Marker dragged to:', lngLat.lat.toFixed(6), lngLat.lng.toFixed(6))
          
          // Get address for the new location
          reverseGeocode(lngLat.lng, lngLat.lat)
        })

        // Update marker when map is clicked
        map.on('click', (e) => {
          const { lng, lat } = e.lngLat
          marker.setLngLat([lng, lat])
          setFormData(prev => ({
            ...prev,
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6)
          }))
          console.log('🖱️ Map clicked, marker moved to:', lat.toFixed(6), lng.toFixed(6))
          
          // Get address for the new location
          reverseGeocode(lng, lat)
        })

        // Hide loading spinner
        setMapLoaded(true)
        console.log('✨ Map initialization complete!')
      })

      // Handle map errors
      map.on('error', (e) => {
        console.error('❌ Map error:', e)
        setMapLoaded(true)
      })

      // Add timeout fallback in case load event never fires
      setTimeout(() => {
        if (!mapLoaded && map && mapRef.current) {
          console.warn('⚠️ Map load timeout - forcing loaded state')
          setMapLoaded(true)
          map.resize()
        }
      }, 5000)

    } catch (error) {
      console.error('❌ Error initializing map:', error)
      setMapLoaded(true)
    }
  }

  // Reverse geocoding function to get address from coordinates
  const reverseGeocode = async (lng: number, lat: number) => {
    try {
      console.log('🔍 Getting address for:', lat, lng)
      const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
      
      if (!accessToken) {
        console.error('❌ Mapbox token not found for geocoding')
        return
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${accessToken}`
      )

      if (!response.ok) {
        console.error('❌ Geocoding request failed')
        return
      }

      const data = await response.json()
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0]
        const address = feature.place_name
        
        console.log('✅ Address found:', address)
        
        setFormData(prev => ({
          ...prev,
          address: address
        }))
      } else {
        console.warn('⚠️ No address found for these coordinates')
      }
    } catch (error) {
      console.error('❌ Error during reverse geocoding:', error)
    }
  }

  const getCurrentLocation = () => {
    setGettingLocation(true)
    
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      setGettingLocation(false)
      return
    }

    console.log('📍 Requesting current location...')
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const accuracy = position.coords.accuracy
        
        console.log('✅ Location obtained:', {
          latitude: lat,
          longitude: lng,
          accuracy: accuracy + ' meters'
        })
        
        setFormData(prev => ({
          ...prev,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6)
        }))

        // Update map and marker
        if (mapRef.current && markerRef.current) {
          console.log('🗺️ Moving map to your location')
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 16, // Closer zoom for better accuracy
            duration: 2000
          })
          markerRef.current.setLngLat([lng, lat])
          
          // Get address for current location
          reverseGeocode(lng, lat)
        } else {
          console.warn('⚠️ Map or marker not ready')
        }

        setGettingLocation(false)
      },
      (error) => {
        console.error('❌ Geolocation error:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        
        let errorMessage = 'Unable to get your current location. '
        
        // Check error code with proper values
        if (error.code === 1) { // PERMISSION_DENIED
          errorMessage += 'Please allow location access in your browser settings.'
        } else if (error.code === 2) { // POSITION_UNAVAILABLE
          errorMessage += 'Location information is unavailable. Please check your GPS/internet connection.'
        } else if (error.code === 3) { // TIMEOUT
          errorMessage += 'Location request timed out. Please try again.'
        } else {
          errorMessage += 'An unknown error occurred: ' + (error.message || 'Unknown')
        }
        
        alert(errorMessage)
        setGettingLocation(false)
      },
      {
        enableHighAccuracy: true, // Request high accuracy GPS
        timeout: 10000, // 10 second timeout
        maximumAge: 0 // Don't use cached position
      }
    )
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addAmenity = (amenity: string) => {
    if (amenity && !formData.amenities.includes(amenity)) {
      setFormData((prev) => ({
        ...prev,
        amenities: [...prev.amenities, amenity],
      }))
    }
    setNewAmenity("")
  }

  const removeAmenity = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.filter((a) => a !== amenity),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const token = getAuthToken()
      if (!token) {
        setSubmitError('You must be logged in to add a property')
        return
      }

      const userId = getCurrentUserId()
      if (!userId) {
        setSubmitError('Unable to identify user. Please log in again.')
        return
      }

      // Prepare FormData (matching backend expectations)
      const formDataToSend = new FormData()
      
      // Basic fields
      formDataToSend.append('name', formData.name)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('price', formData.price)
      formDataToSend.append('propertyType', formData.propertyType.toLowerCase())
      formDataToSend.append('status', 'available')
      
      // Location fields (separate, not nested)
      formDataToSend.append('address', formData.address)
      formDataToSend.append('latitude', formData.latitude || '13.6218')
      formDataToSend.append('longitude', formData.longitude || '123.1815')
      
      // Phone number
      if (formData.phoneNumber) {
        formDataToSend.append('phoneNumber', formData.phoneNumber)
      }
      
      // User IDs and Info
      formDataToSend.append('createdBy', userId)
      formDataToSend.append('postedBy', userId)
      
      // Add owner fullname and email
      if (currentUser) {
        formDataToSend.append('ownerName', currentUser.fullname)
        formDataToSend.append('ownerEmail', currentUser.email)
        console.log('👤 Adding owner info:', { name: currentUser.fullname, email: currentUser.email })
      }
      
      // Amenities (append each one separately)
      formData.amenities.forEach(amenity => {
        formDataToSend.append('amenities', amenity)
      })
      
      // Convert images to base64 and append - backend expects files
      console.log(`📸 Converting ${imageFiles.length} image file(s) to base64...`)
      
      for (let index = 0; index < imageFiles.length; index++) {
        const file = imageFiles[index]
        try {
          // Convert file to base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const result = reader.result as string
              resolve(result)
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
          
          // Create a proper File/Blob for the FormData
          const blob = await fetch(base64).then(r => r.blob())
          formDataToSend.append('images', blob, file.name)
          
          console.log(`  ${index + 1}. ${file.name} converted (${(file.size / 1024).toFixed(2)}KB)`)
        } catch (error) {
          console.error(`❌ Error converting ${file.name}:`, error)
        }
      }

      console.log('🏠 Creating property with images...')
      
      // Log FormData contents for debugging
      console.log('📋 FormData contents:')
      for (const [key, value] of formDataToSend.entries()) {
        if (value instanceof Blob) {
          console.log(`  ${key}: [Blob: ${value.size} bytes, type: ${value.type}]`)
        } else {
          console.log(`  ${key}: ${value}`)
        }
      }

      const response = await fetch('https://rentify-server-ge0f.onrender.com/api/properties', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData - browser will set it automatically with boundary
        },
        body: formDataToSend,
      })

      if (response.status === 401) {
        setSubmitError('Your session has expired. Please log in again.')
        return
      }

      console.log('📡 Response status:', response.status)
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        let errorMessage = 'Failed to create property'
        
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json()
            errorMessage = errorData.message || errorMessage
            console.error('❌ Server error (JSON):', errorData)
          } else {
            const errorText = await response.text()
            console.error('❌ Server error (Text/HTML):', errorText.substring(0, 500))
            errorMessage = `Server error (${response.status}): ${errorText.substring(0, 100)}`
          }
        } catch (parseError) {
          console.error('❌ Could not parse error response:', parseError)
          errorMessage = `Server returned ${response.status} error`
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('✅ Property created:', data)

      // Show success modal
      setShowSuccessModal(true)

      // Clean up object URLs
      formData.images.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })

    } catch (error) {
      console.error('❌ Error creating property:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to create property')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const validFiles: File[] = []
    const previewUrls: string[] = []
    let errorCount = 0

    for (const file of Array.from(files)) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.warn(`⚠️ File ${file.name} is too large (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
        errorCount++
        continue
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.warn(`⚠️ File ${file.name} is not an image`)
        errorCount++
        continue
      }

      validFiles.push(file)
      previewUrls.push(URL.createObjectURL(file))
      console.log(`✅ Added ${file.name} (${(file.size / 1024).toFixed(2)}KB) for upload`)
    }

    if (validFiles.length > 0) {
      setImageFiles(prev => [...prev, ...validFiles])
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...previewUrls]
      }))
      console.log(`📸 Total images ready: ${validFiles.length + imageFiles.length}`)
    }

    if (errorCount > 0) {
      alert(`${errorCount} file(s) were skipped (too large or wrong format)`)
    }
  }

  const removeImage = (index: number) => {
    // Revoke object URL to free memory
    if (formData.images[index].startsWith('blob:')) {
      URL.revokeObjectURL(formData.images[index])
    }
    
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false)
    
    // Reset form
    setFormData({
      name: "",
      description: "",
      price: "",
      address: "",
      latitude: "",
      longitude: "",
      propertyType: "",
      images: [],
      amenities: [],
      phoneNumber: "",
    })
    setImageFiles([])

    // Call callback to refresh properties list
    if (onPropertyAdded) {
      onPropertyAdded()
    }

    // Close the add property modal
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Home className="h-6 w-6 text-blue-600" />
            Add New Property
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Property Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., Modern 2BR Apartment"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Monthly Rent (₱)
              </Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                placeholder="25000"
                required
                className="h-11"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Address
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Complete address in Naga City"
              required
              className="h-11"
            />
          </div>

          {/* Map Location Selector */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Select Location on Map
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="flex items-center gap-2"
              >
                {gettingLocation ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <Navigation className="h-4 w-4" />
                    Use Current Location
                  </>
                )}
              </Button>
            </div>

            {/* Map Container */}
            <div 
              ref={mapContainerRef}
              className="relative w-full h-[400px] rounded-lg border-2 border-slate-200 overflow-hidden"
            >
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              )}
              
              {/* Map Instructions Overlay */}
              {!formData.latitude && mapLoaded && (
                <div className="absolute top-4 left-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg z-10">
                  <p className="text-sm text-slate-700 font-medium">
                    📍 Click on the map or drag the marker to set the property location
                  </p>
                </div>
              )}
            </div>

            {/* Coordinates Display */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-1">Latitude</p>
                <p className="text-sm font-mono text-slate-700">
                  {formData.latitude || '13.6218'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-1">Longitude</p>
                <p className="text-sm font-mono text-slate-700">
                  {formData.longitude || '123.1815'}
                </p>
              </div>
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="text-sm font-semibold text-slate-700">
              Contact Phone Number
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
              placeholder="+63 912 345 6789"
              className="h-11"
            />
          </div>

          {/* Created By (Readonly) */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">
              Created By (Owner)
            </Label>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-1">Name</p>
                <p className="text-sm text-slate-700">
                  {currentUser?.fullname || 'Loading...'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-1">Email</p>
                <p className="text-sm text-slate-700">
                  {currentUser?.email || 'Loading...'}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              This property will be created under your account
            </p>
          </div>

          {/* Property Details */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Property Type</Label>
            <Select value={formData.propertyType} onValueChange={(value) => handleInputChange("propertyType", value)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {propertyTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold text-slate-700">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe your property, its features, and what makes it special..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Property Images
            </Label>

            {/* Upload Button */}
            <div className="flex items-center gap-4">
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('image-upload')?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Select Images
              </Button>
              <p className="text-sm text-slate-500">
                {imageFiles.length > 0 
                  ? `${imageFiles.length} image(s) selected (max 5MB each)`
                  : 'Upload multiple images (JPG, PNG, max 5MB each)'}
              </p>
            </div>

            {/* Image Preview */}
            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Property ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Amenities */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Amenities
            </Label>

            {/* Common Amenities */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {commonAmenities.map((amenity) => (
                <Button
                  key={amenity}
                  type="button"
                  variant={formData.amenities.includes(amenity) ? "default" : "outline"}
                  size="sm"
                  onClick={() => (formData.amenities.includes(amenity) ? removeAmenity(amenity) : addAmenity(amenity))}
                  className="justify-start text-sm"
                >
                  {amenity}
                </Button>
              ))}
            </div>

            {/* Custom Amenity Input */}
            <div className="flex gap-2">
              <Input
                value={newAmenity}
                onChange={(e) => setNewAmenity(e.target.value)}
                placeholder="Add custom amenity"
                className="flex-1"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addAmenity(newAmenity))}
              />
              <Button type="button" onClick={() => addAmenity(newAmenity)} disabled={!newAmenity.trim()}>
                Add
              </Button>
            </div>

            {/* Selected Amenities */}
            {formData.amenities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.amenities.map((amenity) => (
                  <Badge key={amenity} variant="secondary" className="flex items-center gap-1">
                    {amenity}
                    <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => removeAmenity(amenity)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{submitError}</p>
            </div>
          )}
          
          <div className="flex gap-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name || !formData.price || !formData.address}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                'Post Property'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={handleSuccessModalClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl font-bold text-slate-900">
              Property Created Successfully! 🎉
            </DialogTitle>
            <DialogDescription className="text-center text-base pt-3 text-slate-600">
              Your property has been listed successfully and is now visible to potential renters. You can view and manage it from your profile page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-6 pb-2">
            <Button
              onClick={handleSuccessModalClose}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-10 py-6 text-lg font-semibold"
            >
              Awesome! 🏠
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
