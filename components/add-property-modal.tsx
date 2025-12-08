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
import config from '@/lib/config'

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
    // auth data from localStorage suppressed
    if (authData) {
      const parsed = JSON.parse(authData)
      const user = parsed.state?.user
      if (user) {
        const userInfo = {
          id: user._id || user.id || '',
          fullname: user.fullname || user.name || user.fullName || user.username || 'Unknown User',
          email: user.email || 'No email'
        }
        // returning user info (suppressed)
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
      // Modal opened - user info load (suppressed)
      const userInfo = getCurrentUserInfo()
      setCurrentUser(userInfo)
    }
  }, [isOpen])

  // Initialize map when modal opens
  useEffect(() => {
    if (isOpen && !mapRef.current) {
      // Modal opened, checking map container (suppressed)
      
      // Wait for container to be ready
      const checkContainer = () => {
        if (mapContainerRef.current) {
          // Container found, initializing map (suppressed)
          initializeMap()
        } else {
          // Container not ready, retrying (suppressed)
          setTimeout(checkContainer, 100)
        }
      }
      
      // Start checking after a small delay
      const timer = setTimeout(checkContainer, 100)
      
      return () => clearTimeout(timer)
    }

    // Cleanup map on modal close
    if (!isOpen && mapRef.current) {
      // Cleaning up map (suppressed)
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

      // Creating map instance (suppressed)

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

      // Map container size logged (suppressed)

      // Add controls before load event (they'll be ready when map loads)
      map.addControl(new mapboxgl.NavigationControl(), 'top-right')

      // Wait for map to load before creating marker
      map.on('load', () => {
      // Map loaded successfully (suppressed)
        
        // Resize map to ensure proper rendering
        setTimeout(() => {
          if (map && mapRef.current) {
            map.resize()
            // Map resized (suppressed)
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

  // Maximum allowed monthly price for listings (in PHP)
  const MAX_PRICE = 50000

  const API_BASE: string = config.API_API

  // Derived validation state for price (must be a positive number and not exceed MAX)
  const priceNumber = Number(formData.price || 0)
  const isPriceValid = !isNaN(priceNumber) && priceNumber > 0 && priceNumber <= MAX_PRICE

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
      // Validate price before sending (must be positive and not exceed MAX_PRICE)
      const priceVal = Number(formData.price)
      if (isNaN(priceVal) || priceVal <= 0 || priceVal > MAX_PRICE) {
        setSubmitError(`Price must be at most ₱${MAX_PRICE.toLocaleString()}.`)
        setIsSubmitting(false)
        return
      }
      // Validate required fields before sending
      const missing: string[] = []
      if (!formData.name || formData.name.trim() === '') missing.push('Name')
      if (!formData.price || String(formData.price).trim() === '') missing.push('Price')
      if (!formData.address || formData.address.trim() === '') missing.push('Address')
      if (!formData.propertyType || String(formData.propertyType).trim() === '') missing.push('Property Type')

      if (missing.length > 0) {
        // Show a helpful message listing the missing required fields
        setSubmitError(`Please provide the required information: ${missing.join(', ')}.`)
        setIsSubmitting(false)
        return
      }
      const token = getAuthToken()
      if (!token) {
        setSubmitError('You must be logged in to add a property')
        setIsSubmitting(false)
        return
      }

      const userId = getCurrentUserId()
      if (!userId) {
        setSubmitError('Unable to identify user. Please log in again.')
        setIsSubmitting(false)
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
        // Owner info appended (suppressed)
      }
      
      // Amenities (append each one separately)
      formData.amenities.forEach(amenity => {
        formDataToSend.append('amenities', amenity)
      })
      
      // Append images directly as File objects - most reliable method
      // Image file upload count suppressed
      
      if (imageFiles.length > 0) {
        for (let index = 0; index < imageFiles.length; index++) {
          const file = imageFiles[index]
          try {
            // Append file directly - browser handles multipart/form-data encoding
            formDataToSend.append('images', file)
            // File details suppressed
          } catch (error) {
            console.error(`❌ Error adding ${file.name}:`, error)
          }
        }
      } else {
        // No images to upload
      }

      // Creating property with images (logs suppressed)
      // FormData contents suppressed for privacy
      const endpoint = `${API_BASE.replace(/\/$/, '')}/api/properties`
      if (process.env.NODE_ENV === 'development') console.log('📡 Creating property via:', endpoint)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData - browser will set it automatically with boundary
        },
        body: formDataToSend,
      })

      if (response.status === 401) {
        setSubmitError('Your session has expired. Please log in again.')
        setIsSubmitting(false)
        return
      }

      // Response status and headers suppressed

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        let errorMessage = `Failed to create property (status ${response.status})`
        let fullBody = ''

        try {
          // Read full body as text for better debugging (safe even if JSON)
          fullBody = await response.text()
          if (contentType && contentType.includes('application/json')) {
            try {
              const parsed = JSON.parse(fullBody)
              if (parsed.message) errorMessage = parsed.message
              console.error('❌ Server error (JSON parsed):', parsed)
            } catch (jsonParseErr) {
              console.error('❌ Server responded with JSON-like content but JSON.parse failed:', jsonParseErr)
            }
          } else {
            console.error('❌ Server error (Text/HTML):', fullBody.substring(0, 2000))
          }
        } catch (readErr) {
          console.error('❌ Failed to read error response body:', readErr)
        }

        if (process.env.NODE_ENV === 'development' && fullBody) {
          errorMessage = `${errorMessage}: ${fullBody.substring(0, 1000)}`
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()
      // Property created successfully (response suppressed)
      
      // Check if images were uploaded to Cloudinary
      if (imageFiles.length > 0) {
        const uploadedImages = data.property?.images || data.images || []
        if (uploadedImages.length === 0) {
          console.warn('⚠️ WARNING: Images were sent but none were returned from backend!')
          console.warn('⚠️ Backend may have failed to upload to Cloudinary')
        } else if (uploadedImages.length < imageFiles.length) {
          console.warn('⚠️ WARNING: Partial image upload detected')
        } else {
          // All images uploaded (URLs suppressed)
        }
      }

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
      console.error('❌ Error type:', typeof error)
      console.error('❌ Error name:', error instanceof Error ? error.name : 'Unknown')
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error))
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      
      let errorMessage = 'Failed to create property'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else {
        errorMessage = 'An unexpected error occurred. Please try again.'
      }
      
      setSubmitError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    console.log(`📸 Processing ${files.length} file(s)...`)

    const validFiles: File[] = []
    const previewUrls: string[] = []
    let errorCount = 0

    for (const file of Array.from(files)) {
      console.log(`🔍 Processing file: ${file.name}, size: ${(file.size / 1024).toFixed(2)}KB, type: ${file.type}`)
      
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
      
      // Create preview URL using FileReader for better mobile compatibility
      try {
        const reader = new FileReader()
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => {
            const result = e.target?.result as string
            resolve(result)
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        
        previewUrls.push(dataUrl)
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Added ${file.name} (${(file.size / 1024).toFixed(2)}KB) with preview`)
        }
      } catch (error) {
        console.error(`❌ Error creating preview for ${file.name}:`, error)
        // Fallback to blob URL if FileReader fails
        previewUrls.push(URL.createObjectURL(file))
      }
    }

    if (validFiles.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`📸 Adding ${validFiles.length} valid files to state...`)
        console.log(`📸 Preview URLs created:`, previewUrls.length)
        console.log(`📸 First preview URL (truncated):`, previewUrls[0]?.substring(0, 50))
      }
      
      setImageFiles(prev => {
        const newFiles = [...prev, ...validFiles]
        if (process.env.NODE_ENV === 'development') console.log(`📸 Total files in state: ${newFiles.length}`)
        return newFiles
      })
      
      setFormData(prev => {
        const newImages = [...prev.images, ...previewUrls]
        if (process.env.NODE_ENV === 'development') console.log(`📸 Total images in formData: ${newImages.length}`)
        return {
          ...prev,
          images: newImages
        }
      })
      
      // Log final state after a short delay
      setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`📸 Final check - imageFiles count: ${imageFiles.length + validFiles.length}`)
          console.log(`📸 Final check - formData.images count:`, formData.images.length + previewUrls.length)
        }
      }, 100)
    }

    if (errorCount > 0) {
      alert(`${errorCount} file(s) were skipped (too large or wrong format)`)
    }
    
    // Reset input to allow selecting the same file again
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    // Revoke object URL to free memory (only for blob URLs, not data URLs)
    const imageUrl = formData.images[index]
    if (imageUrl && imageUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(imageUrl)
      } catch (error) {
        console.warn('Failed to revoke blob URL:', error)
      }
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
      <DialogContent className="max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Home className="h-5 sm:h-6 w-5 sm:w-6 text-blue-600" />
            Add New Property
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* Basic Information */}
          <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                <FileText className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                Property Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., Modern 2BR Apartment"
                required
                className="h-10 sm:h-11 text-sm sm:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                <DollarSign className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                Monthly Rent (₱)
              </Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                placeholder="25000"
                required
                className="h-10 sm:h-11 text-sm sm:text-base"
              />
              {!isPriceValid && formData.price !== "" && (
                <p className="text-xs text-red-600 mt-1">Price must be at most ₱{MAX_PRICE.toLocaleString()}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
              <MapPin className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
              Address
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Complete address in Naga City"
              required
              className="h-10 sm:h-11 text-sm sm:text-base"
            />
          </div>

          {/* Map Location Selector */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
              <Label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                <MapPin className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                Select Location on Map
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="flex items-center gap-2 text-xs sm:text-sm h-8 sm:h-9"
              >
                {gettingLocation ? (
                  <>
                    <Loader2 className="h-3.5 sm:h-4 w-3.5 sm:w-4 animate-spin" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <Navigation className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                    Use Current Location
                  </>
                )}
              </Button>
            </div>

            {/* Map Container */}
            <div 
              ref={mapContainerRef}
              className="relative w-full h-[280px] sm:h-[350px] md:h-[400px] rounded-lg border-2 border-slate-200 overflow-hidden"
            >
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                  <Loader2 className="h-6 sm:h-8 w-6 sm:w-8 animate-spin text-blue-500" />
                </div>
              )}
              
              {/* Map Instructions Overlay */}
              {!formData.latitude && mapLoaded && (
                <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 bg-white/95 backdrop-blur-sm p-2.5 sm:p-3 rounded-lg shadow-lg z-10">
                  <p className="text-xs sm:text-sm text-slate-700 font-medium">
                    📍 Click on the map or drag the marker to set the property location
                  </p>
                </div>
              )}
            </div>

            {/* Coordinates Display */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2">
              <div className="p-2.5 sm:p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-1">Latitude</p>
                <p className="text-xs sm:text-sm font-mono text-slate-700">
                  {formData.latitude || '13.6218'}
                </p>
              </div>
              <div className="p-2.5 sm:p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-1">Longitude</p>
                <p className="text-xs sm:text-sm font-mono text-slate-700">
                  {formData.longitude || '123.1815'}
                </p>
              </div>
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="text-xs sm:text-sm font-semibold text-slate-700">
              Contact Phone Number
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
              placeholder="+63 912 345 6789"
              className="h-10 sm:h-11 text-sm sm:text-base"
            />
          </div>

          {/* Created By (Readonly) */}
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm font-semibold text-slate-700">
              Created By (Owner)
            </Label>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="p-2.5 sm:p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-1">Name</p>
                <p className="text-xs sm:text-sm text-slate-700">
                  {currentUser?.fullname || 'Loading...'}
                </p>
              </div>
              <div className="p-2.5 sm:p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 mb-1">Email</p>
                <p className="text-xs sm:text-sm text-slate-700 truncate">
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
            <Label className="text-xs sm:text-sm font-semibold text-slate-700">Property Type</Label>
            <Select value={formData.propertyType} onValueChange={(value) => handleInputChange("propertyType", value)}>
              <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
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
            <Label htmlFor="description" className="text-xs sm:text-sm font-semibold text-slate-700">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe your property, its features, and what makes it special..."
              rows={4}
              className="resize-none text-sm sm:text-base"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-3 sm:space-y-4">
            <Label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Camera className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
              Property Images
            </Label>

            {/* Upload Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
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
                className="flex items-center gap-2 text-xs sm:text-sm h-9 sm:h-10"
              >
                <Upload className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                Select Images
              </Button>
              <p className="text-xs sm:text-sm text-slate-500">
                {imageFiles.length > 0 
                  ? `${imageFiles.length} image(s) selected (max 5MB each)`
                  : 'Upload or take photos (max 5MB each)'}
              </p>
            </div>

            {/* Image Preview */}
            {formData.images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {(() => {
                  if (process.env.NODE_ENV === 'development') console.log(`🖼️ Rendering ${formData.images.length} image preview(s)`)
                  return null
                })()}
                {formData.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Property ${index + 1}`}
                      className="w-full h-28 sm:h-32 object-cover rounded-lg border"
                      onLoad={() => {
                        if (process.env.NODE_ENV === 'development') console.log(`✅ Image ${index + 1} loaded successfully`)
                      }}
                      onError={(e) => {
                        if (process.env.NODE_ENV === 'development') {
                          console.error(`❌ Failed to load image ${index + 1}:`, image.substring(0, 50))
                          console.error('Error details:', e)
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-lg border border-slate-200">
                
              </div>
            )}
          </div>

          {/* Amenities */}
          <div className="space-y-3 sm:space-y-4">
            <Label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Tag className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
              Amenities
            </Label>

            {/* Common Amenities */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {commonAmenities.map((amenity) => (
                <Button
                  key={amenity}
                  type="button"
                  variant={formData.amenities.includes(amenity) ? "default" : "outline"}
                  size="sm"
                  onClick={() => (formData.amenities.includes(amenity) ? removeAmenity(amenity) : addAmenity(amenity))}
                  className="justify-start text-xs sm:text-sm h-8 sm:h-9"
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
                className="flex-1 h-9 sm:h-10 text-sm sm:text-base"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addAmenity(newAmenity))}
              />
              <Button type="button" onClick={() => addAmenity(newAmenity)} disabled={!newAmenity.trim()} className="h-9 sm:h-10 text-xs sm:text-sm">
                Add
              </Button>
            </div>

            {/* Selected Amenities */}
            {formData.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {formData.amenities.map((amenity) => (
                  <Badge key={amenity} variant="secondary" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-0.5">
                    {amenity}
                    <X className="h-3 w-3 cursor-pointer hover:text-red-600" onClick={() => removeAmenity(amenity)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          {submitError && (
            <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-xs sm:text-sm">{submitError}</p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-4 sm:pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 bg-transparent h-10 sm:h-11 text-sm sm:text-base" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name || !formData.price || !formData.address || !isPriceValid}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 h-10 sm:h-11 text-sm sm:text-base"
              aria-disabled={isSubmitting || !formData.name || !formData.price || !formData.address || !isPriceValid}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 sm:h-4 w-3.5 sm:w-4 mr-2 animate-spin" />
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
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-3 sm:mb-4">
              <div className="w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 sm:w-12 h-10 sm:h-12 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-lg sm:text-xl md:text-2xl font-bold text-slate-900">
              Property Created Successfully! 🎉
            </DialogTitle>
            <DialogDescription className="text-center text-sm sm:text-base pt-2 sm:pt-3 text-slate-600">
              Your property has been listed successfully and is now visible to potential renters. You can view and manage it from your profile page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4 sm:pt-6 pb-1 sm:pb-2">
            <Button
              onClick={handleSuccessModalClose}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 sm:px-10 py-5 sm:py-6 text-base sm:text-lg font-semibold"
            >
              Awesome! 🏠
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
