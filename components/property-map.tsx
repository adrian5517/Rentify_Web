"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import mapboxgl from "mapbox-gl"
import type { Property } from "@/lib/property-data"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { escapeHTML, sanitizeInput } from "@/lib/security"
import { useAuthStore } from "@/lib/auth-store"
import { sendMessageAPI } from "@/lib/api"

// Modern Design System with Professional Icons
const modernStyles = `
  .modern-button {
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .modern-button:hover {
    transform: translateY(-1px);
  }
  
  .icon-nav::before { content: '→'; }
  .icon-location::before { content: '📍'; }
  .icon-home::before { content: '🏠'; }
  .icon-bed::before { content: '🛏'; }
  .icon-bath::before { content: '🚿'; }
  .icon-car::before { content: '🚗'; }
  .icon-phone::before { content: '📞'; }
  .icon-close::before { content: '✕'; }
  .icon-refresh::before { content: '↻'; }
  .icon-gps::before { content: '⊙'; }
  
  .progress-bar {
    width: 100%;
    height: 4px;
    background: var(--border);
    border-radius: 2px;
    overflow: hidden;
  }
  
    background: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
  }
  
  .section-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    box-shadow: var(--shadow);
  }
  
  .info-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
  }
  
  .info-icon {
    width: 40px;
    height: 40px;
    background: var(--surface-secondary);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    color: var(--primary);
  }
  
  .animate-fade-in {
    animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .animate-slide-up {
    animation: slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .animate-scale-in {
    animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .line-clamp-4 {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
    }
  }
  
  .gradient-bg {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 25%, #e2e8f0 50%, #f8fafc 75%, #ffffff 100%);
  }
  
  .text-gradient {
    background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

// Set your Mapbox access token from environment variable (required)
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiYWRyaWFuNTUxNyIsImEiOiJjbWZkdTg4dmIwMThpMnFyNG10cWJwZjRhIn0.JLRzE6qmyDfePYgSs11ALg'
interface PropertyMapProps {
  properties: Property[]
  clusters?: any[]
  center?: [number, number]
  zoom?: number
  focusOnProperty?: boolean // New prop to indicate if we should focus on a single property
  selectedCluster?: number
  onClusterChange?: (cluster: number) => void
  enableClustering?: boolean
  navigationMode?: boolean
  onNavigationToggle?: (enabled: boolean) => void
}

// Enhanced clustering interface for ML integration
interface MLProperty extends Property {
  cluster?: number
}

interface RouteStep {
  instruction: string
  distance: number
  duration: number
  type: string
  modifier?: string
  coordinates: number[][]
}

interface ClusterStats {
  idx: number
  avg: number
  count: number
}

// Modern Skeleton Loader Component
const PropertySkeleton = () => (
  <div className="animate-pulse p-4 space-y-3">
    <div className="flex items-center space-x-3">
      <div className="h-16 w-16 bg-gradient-to-br from-slate-200 to-slate-300 rounded-xl"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-3/4"></div>
        <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-1/2"></div>
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg"></div>
      <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-4/5"></div>
    </div>
    <div className="flex space-x-2">
      <div className="h-6 bg-gradient-to-r from-slate-200 to-slate-300 rounded-full w-16"></div>
      <div className="h-6 bg-gradient-to-r from-slate-200 to-slate-300 rounded-full w-20"></div>
    </div>
  </div>
);

// Haversine distance in KM
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Calculate bearing from one point to another (for map orientation)
function getBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => deg * Math.PI / 180
  const toDeg = (rad: number) => rad * 180 / Math.PI
  const dLon = toRad(lon2 - lon1)
  const lat1Rad = toRad(lat1)
  const lat2Rad = toRad(lat2)
  const y = Math.sin(dLon) * Math.cos(lat2Rad)
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)
  let brng = Math.atan2(y, x)
  brng = toDeg(brng)
  return (brng + 360) % 360
}

export default function PropertyMap({
  properties,
  clusters = [],
  center = [123.1815, 13.6218], // Naga City
  zoom = 13,
  focusOnProperty = false, // Default to false for multiple properties view
  selectedCluster = 0,
  onClusterChange,
  enableClustering = false,
  navigationMode = false,
  onNavigationToggle,
}: PropertyMapProps) {
  const router = useRouter()
  const { user: currentUser } = useAuthStore()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null)
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null)
  const [mlProperties, setMlProperties] = useState<MLProperty[]>([])
  const [loadingML, setLoadingML] = useState(false)
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  

  // Helper function to get owner information from property
  const getOwnerInfo = (property: Property) => {
    // Debug: Log property data to see what we have
    console.log('Getting owner info for property:', {
      name: property.name,
      postedBy: property.postedBy,
      createdBy: property.createdBy,
      owner: property.owner,
      phoneNumber: property.phoneNumber
    })
    
    // First check if there's a legacy owner field
    if (property.owner) {
      return property.owner
    }
    
    // Check postedBy field (can be populated User object or just ID)
    if (property.postedBy && typeof property.postedBy === 'object') {
      return {
        id: property.postedBy._id,
        name: property.postedBy.fullName || property.postedBy.name || property.postedBy.username || 'Property Owner',
        profilePicture: property.postedBy.profilePicture,
        phone: property.postedBy.phoneNumber || property.postedBy.phone || property.phoneNumber,
        email: property.postedBy.email
      }
    }
    
    // Check createdBy field
    if (property.createdBy && typeof property.createdBy === 'object') {
      return {
        id: property.createdBy._id,
        name: property.createdBy.fullName || property.createdBy.name || property.createdBy.username || 'Property Owner',
        profilePicture: property.createdBy.profilePicture,
        phone: property.createdBy.phoneNumber || property.createdBy.phone || property.phoneNumber,
        email: property.createdBy.email
      }
    }
    
    // Fallback: If we have a phoneNumber on the property but no populated owner, create basic owner info
    if (property.phoneNumber || property.postedBy || property.createdBy) {
      return {
        id: (typeof property.postedBy === 'string' ? property.postedBy : property.createdBy) || 'unknown',
        name: 'Property Owner',
        phone: property.phoneNumber,
        email: undefined,
        profilePicture: undefined
      }
    }
    
    return null
  }
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Confirmation modal state for Send Now
  const [confirmPayload, setConfirmPayload] = useState<{
    ownerId: string
    senderId: string
    prefill: string
  } | null>(null)
  const [isSendingNow, setIsSendingNow] = useState(false)

  // Perform the actual send when user confirms
  const doSendNow = async () => {
    if (!confirmPayload) return
    setIsSendingNow(true)
    try {
      await sendMessageAPI(String(confirmPayload.senderId), String(confirmPayload.ownerId), confirmPayload.prefill)
      try { localStorage.setItem('messages-contact', String(confirmPayload.ownerId)) } catch (e) { /* ignore */ }
      router.push(`/messages?contact=${confirmPayload.ownerId}`)
      alert('Message sent to owner. Opened Messages.')
    } catch (err) {
      console.error('❌ Send Now failed', err)
      // If the error indicates missing authentication, navigate to login
      const message = err instanceof Error ? err.message : String(err)
      if (message.toLowerCase().includes('auth') || message.toLowerCase().includes('token')) {
        // Friendly prompt and redirect to login/signup
        if (confirm('You need to sign in to message the owner. Would you like to sign in now?')) {
          router.push('/auth')
        }
      } else {
        alert('Failed to send message. Please try again.')
      }
    } finally {
      setIsSendingNow(false)
      setConfirmPayload(null)
    }
  }

  const initializedRef = useRef(false)
  const loadedRef = useRef(false)
  const propertiesRef = useRef<Property[]>(properties)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null)
  const routeSourceId = useRef<string>('route-source')
  const routeLayerId = useRef<string>('route-layer')

  // Keep latest properties reference
  useEffect(() => { propertiesRef.current = properties }, [properties])

  // Static cluster labels and colors for consistent UI - Added "All Properties" as default
  const staticLabels = ['Budget', 'Standard', 'Premium', 'All']
  const staticColors = ['#4CAF50', '#FFC107', '#E91E63', '#2563eb']

  // Direct cluster mapping - no need for dynamic remapping since we assign by price
  // Button index 0 = Low Budget (cluster 0)
  // Button index 1 = Mid Range (cluster 1)
  // Button index 2 = High End (cluster 2)
  // Button index 3 = All Properties (show all)
  const getClusterMapping = useCallback((mlProps: MLProperty[]) => {
    // Simple 1:1 mapping - button index matches cluster index
    return [0, 1, 2]
  }, [])

  // Fetch ML clustered properties from API
  const fetchMLClusters = useCallback(async () => {
    if (!enableClustering || !userLocation) return

    setLoadingML(true)
    
    try {
      // Fetch all properties from the database
      const fullPropertyRes = await fetch('https://rentify-server-ge0f.onrender.com/api/properties')
      
      if (!fullPropertyRes.ok) {
        throw new Error(`Failed to fetch properties: ${fullPropertyRes.status}`)
      }
      
      const data = await fullPropertyRes.json()
      
      // Handle different response formats from backend
      let allProperties: any[] = []
      if (Array.isArray(data)) {
        allProperties = data
      } else if (data.properties && Array.isArray(data.properties)) {
        allProperties = data.properties
      } else if (data.success && data.properties && Array.isArray(data.properties)) {
        allProperties = data.properties
      } else {
        console.error('Unexpected API response format:', data)
        throw new Error('Invalid API response format')
      }
      
      console.log(`📊 Total properties from database: ${allProperties.length}`)

      // Use ML API but OVERRIDE with strict price-based classification
      console.log('🤖 Classifying properties using ML API (with price-based override)...')
      const classifiedProperties = await Promise.all(
        allProperties.map(async (property: any) => {
          const price = property.price || 0
          let cluster
          
          try {
            // Call ML API (for logging/future use)
            const response = await fetch('/api/ml-predict', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                price: property.price || 0,
                latitude: property.location.latitude,
                longitude: property.location.longitude
              })
            })

            if (response.ok) {
              const result = await response.json()
              console.log(`  🔮 ML prediction for ${property.name}: ${result.cluster_label} (cluster ${result.cluster_id})`)
            }
          } catch (error) {
            console.warn(`⚠️ ML API error for property ${property._id}:`, error)
          }

          // OVERRIDE: Always use STRICT price-based classification
          if (price > 0 && price <= 3000) {
            cluster = 0 // Low Budget (₱1 - ₱3,000)
          } else if (price > 3000 && price <= 5000) {
            cluster = 1 // Mid Range (₱3,001 - ₱5,000)
          } else if (price > 5000) {
            cluster = 2 // High End (₱5,001+)
          } else {
            cluster = 2 // Default to High End if price is 0 or invalid
          }
          
          console.log(`  ✅ ${property.name} (₱${price.toLocaleString()}): ASSIGNED to Cluster ${cluster}`)
          return { ...property, cluster }
        })
      )

      console.log(`✅ Classified all ${classifiedProperties.length} properties`)
      console.log(`   - Low Budget (0): ${classifiedProperties.filter((p: any) => p.cluster === 0).length}`)
      console.log(`   - Mid Range (1): ${classifiedProperties.filter((p: any) => p.cluster === 1).length}`)
      console.log(`   - High End (2): ${classifiedProperties.filter((p: any) => p.cluster === 2).length}`)
      
      setMlProperties(classifiedProperties)
    } catch (error) {
      console.error('❌ Error fetching properties from database:', error)
      // Final fallback: Use props with STRICT price-based clustering
      const clusteredProperties = properties.map((prop) => {
        const price = prop.price || 0
        let cluster
        
        // STRICT price ranges
        if (price > 0 && price <= 3000) {
          cluster = 0 // Low Budget (₱1 - ₱3,000)
        } else if (price > 3000 && price <= 5000) {
          cluster = 1 // Mid Range (₱3,001 - ₱5,000)
        } else if (price > 5000) {
          cluster = 2 // High End (₱5,001+)
        } else {
          cluster = 2 // Default to High End if price is 0 or invalid
        }
        
        return { ...prop, cluster }
      })
      setMlProperties(clusteredProperties)
    }
    setLoadingML(false)
  }, [enableClustering, userLocation?.lat, userLocation?.lng, properties])

  // Get turn-by-turn directions
  const getTurnByTurnDirections = useCallback(async (start: [number, number], end: [number, number]) => {
    try {
      const token = mapboxgl.accessToken
      if (!token) throw new Error('Missing Mapbox access token for directions')
      
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full&steps=true&access_token=${token}`
      const response = await fetch(url)
      
      if (!response.ok) throw new Error(`Directions request failed: ${response.status}`)
      
      const data = await response.json()
      const route = data?.routes?.[0]
      if (!route) throw new Error('No route found')

      const steps: RouteStep[] = route.legs[0].steps.map((step: any) => ({
        instruction: step.maneuver.instruction,
        distance: step.distance,
        duration: step.duration,
        type: step.maneuver.type,
        modifier: step.maneuver.modifier,
        coordinates: step.geometry.coordinates
      }))

      setRouteSteps(steps)
      setCurrentStep(0)
      return steps
    } catch (error) {
      console.error('Error getting turn-by-turn directions:', error)
      return []
    }
  }, [])

  // Get direction icon based on maneuver type
  const getDirectionIcon = useCallback((type: string, modifier?: string) => {
    switch (type) {
      case 'turn':
        switch (modifier) {
          case 'left': return '⬅️'
          case 'right': return '➡️'
          case 'slight left': return '↖️'
          case 'slight right': return '↗️'
          case 'sharp left': return '⤴️'
          case 'sharp right': return '⤵️'
          default: return '➡️'
        }
      case 'arrive': return '🏁'
      case 'depart': return '🚗'
      case 'continue': return '⬆️'
      default: return '🧭'
    }
  }, [])

  // Enhanced geolocation with better accuracy and manual override
  useEffect(() => {
    let locationTimeout: NodeJS.Timeout
    let watchId: number | null = null
    
    if (navigator.geolocation) {
      console.log("🌍 Starting enhanced geolocation...")
      
      locationTimeout = setTimeout(() => {
        console.log("⏰ Geolocation timeout - using fallback location (Naga City)")
        setUserLocation({ lat: 13.6218, lng: 123.1815 })
      }, 15000) // Increased timeout for better accuracy
      
      // First try to get a quick position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(locationTimeout)
          const newLocation = { 
            lat: position.coords.latitude, 
            lng: position.coords.longitude 
          }
          setUserLocation(newLocation)
          setLocationAccuracy(position.coords.accuracy)
          console.log("✅ Initial location obtained:", newLocation, "Accuracy:", position.coords.accuracy + "m")
          
          // Then start watching for more accurate position
          watchId = navigator.geolocation.watchPosition(
            (position) => {
              const watchLocation = { 
                lat: position.coords.latitude, 
                lng: position.coords.longitude 
              }
              
              // Only update if accuracy is better than 100m
              if (position.coords.accuracy <= 100) {
                setUserLocation(watchLocation)
                setLocationAccuracy(position.coords.accuracy)
                console.log("📍 Updated location:", watchLocation, "Accuracy:", position.coords.accuracy + "m")
                
                // Stop watching after getting good accuracy
                if (position.coords.accuracy <= 50 && watchId) {
                  navigator.geolocation.clearWatch(watchId)
                  watchId = null
                  console.log("🎯 High accuracy achieved, stopping location watch")
                }
              }
            },
            (error) => {
              console.warn("⚠️ Location watch error:", error)
            },
            { 
              enableHighAccuracy: true, 
              maximumAge: 30000, 
              timeout: 10000 
            }
          )
        },
        (e) => {
          clearTimeout(locationTimeout)
          console.log("⚠️ Location access denied or error:", e.message)
          
          // Try with less strict requirements
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const fallbackLocation = { lat: position.coords.latitude, lng: position.coords.longitude }
              setUserLocation(fallbackLocation)
              console.log("📍 Fallback location obtained:", fallbackLocation)
            },
            () => {
              console.log("❌ All location attempts failed, using Naga City")
              setUserLocation({ lat: 13.6218, lng: 123.1815 })
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
          )
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, 
          maximumAge: 60000 
        }
      )
    } else {
      console.log("❌ Geolocation not supported, using Naga City")
      setUserLocation({ lat: 13.6218, lng: 123.1815 })
    }

    return () => {
      if (locationTimeout) clearTimeout(locationTimeout)
      if (watchId) {
        navigator.geolocation.clearWatch(watchId)
        console.log("🛑 Stopped location watching")
      }
    }
  }, []) // Only run once on mount

  // Fetch ML clusters when location is available - with better error handling
  useEffect(() => {
    if (enableClustering && userLocation) {
      console.log("🧠 Fetching ML clusters...")
      fetchMLClusters().catch(console.error)
    }
  }, [enableClustering, userLocation?.lat, userLocation?.lng]) // Only depend on specific location values

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
  }, [])

  const clearRoute = useCallback((map: mapboxgl.Map) => {
    try {
      if (map.getLayer(routeLayerId.current)) map.removeLayer(routeLayerId.current)
      if (map.getSource(routeSourceId.current)) map.removeSource(routeSourceId.current)
    } catch {
      // ignore
    }
    setRouteInfo(null)
  }, [])

  const drawDirections = useCallback(async (map: mapboxgl.Map, from: [number, number], to: [number, number]) => {
    clearRoute(map)
    const token = mapboxgl.accessToken
    if (!token) throw new Error('Missing Mapbox access token for directions')
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from[0]},${from[1]};${to[0]},${to[1]}?geometries=geojson&overview=full&access_token=${token}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Directions request failed: ${res.status}`)
    const data = await res.json()
    const route = data?.routes?.[0]
    if (!route) throw new Error('No route found')
    const geometry = route.geometry

    // Source
    map.addSource(routeSourceId.current, {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry }
    } as any)

    // Layer
    map.addLayer({
      id: routeLayerId.current,
      type: 'line',
      source: routeSourceId.current,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#2563eb', 'line-width': 5, 'line-opacity': 0.85 }
    })

    // Fit bounds
    try {
      const coords: [number, number][] = geometry.coordinates
      let minX = coords[0][0], minY = coords[0][1], maxX = coords[0][0], maxY = coords[0][1]
      for (const [x, y] of coords) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y }
      map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 60, maxZoom: 16 })
    } catch {}

    setRouteInfo({ distanceKm: route.distance / 1000, durationMin: route.duration / 60 })
  }, [clearRoute])

  const addMarkersToMap = useCallback((map: mapboxgl.Map, props: Property[]) => {
    clearMarkers()

    // Use ML properties if clustering is enabled, otherwise use regular properties
    const activeProperties = enableClustering && mlProperties.length > 0 ? mlProperties : props
    
    // Filter by selected cluster if clustering is enabled
    // Index 3 = "All Properties" - show all properties without filtering
    const filteredProperties = enableClustering && mlProperties.length > 0 
      ? (() => {
          if (selectedCluster === 3) {
            // Show all properties when "All Properties" is selected
            return mlProperties
          }
          // Filter by specific cluster (0=Low Budget, 1=Mid Range, 2=High End)
          const clusterMap = getClusterMapping(mlProperties)
          return mlProperties.filter(p => p.cluster === clusterMap[selectedCluster])
        })()
      : activeProperties

    console.log(`🗺️ Displaying ${filteredProperties.length} properties for cluster: ${staticLabels[selectedCluster] || selectedCluster}`)

    // Filter out properties without valid numeric coordinates to avoid map errors
    const invalidCoords: string[] = []
    const validProperties = filteredProperties.filter((p: any) => {
      try {
        const lat = p?.location?.latitude
        const lng = p?.location?.longitude
        const nLat = Number(lat)
        const nLng = Number(lng)
        const ok = Number.isFinite(nLat) && Number.isFinite(nLng)
        if (!ok) invalidCoords.push(`${p._id || p.id || p.name || 'unknown'}`)
        return ok
      } catch (e) {
        invalidCoords.push(`${p._id || p.id || p.name || 'unknown'}`)
        return false
      }
    })

    if (invalidCoords.length > 0) {
      console.warn('Some properties have invalid or missing coordinates and will be skipped on the map:', invalidCoords)
    }

    // Only add user marker if not focusing on a single property
    if (!focusOnProperty) {
      // User marker with custom person icon
      if (userLocation) {
        // Create custom person icon marker matching property style
        const userEl = document.createElement('div')
        userEl.className = 'custom-user-marker'
        userEl.style.cssText = `
          width: 50px;
          height: 50px;
          cursor: pointer;
          position: absolute;
          transform: translate(-50%, -50%);
          pointer-events: auto;
        `
        
        // Create inner circle with person icon
        const userInner = document.createElement('div')
        userInner.style.cssText = `
          width: 100%;
          height: 100%;
          background-color: #3B82F6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          border: 3px solid white;
        `
        
        // Add person icon SVG
        userInner.innerHTML = `
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        `
        
        userEl.appendChild(userInner)
        
        // Add hover effect
        userEl.addEventListener('mouseenter', () => {
          userInner.style.transform = 'scale(1.15)'
          userInner.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.5)'
        })
        userEl.addEventListener('mouseleave', () => {
          userInner.style.transform = 'scale(1)'
          userInner.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)'
        })

        const userMarker = new mapboxgl.Marker({ element: userEl })
          .setLngLat([userLocation.lng, userLocation.lat])
          .addTo(map)
        markersRef.current.push(userMarker)
      }
    }

    // Property markers
    const skipped: string[] = []
    validProperties.forEach((property: MLProperty) => {
      const latNum = Number(property?.location?.latitude)
      const lngNum = Number(property?.location?.longitude)
      if (!isFinite(latNum) || !isFinite(lngNum)) {
        skipped.push(property?._id || property?.id || property?.name || 'unknown')
        return
      }
      try {
        let distanceText = ""
        let distanceKm = 0
        if (userLocation) {
          distanceKm = calculateDistance(userLocation.lat, userLocation.lng, property.location.latitude, property.location.longitude)
          distanceText = `${distanceKm.toFixed(1)}km away`
        }

        // Dynamic marker color based on cluster or status
        let markerColor = "#10b981" // Default green
        if (enableClustering && property.cluster !== undefined) {
          // When clustering is enabled and the property has a cluster index,
          // color markers by their cluster regardless of the selectedCluster
          // (this keeps the "All" view color-coded per cluster).
          const clusterIdx = Math.max(0, Math.min(property.cluster, staticColors.length - 1))
          markerColor = staticColors[clusterIdx]
        } else {
          // When clustering is disabled or property has no cluster, fall back to status colors
          markerColor = property.status === "available" ? "#10b981" : 
                       property.status === "For rent" ? "#3b82f6" : 
                       property.status === "For sale" ? "#f59e0b" : 
                       "#ef4444" // fully booked
        }

        // Create custom home icon marker
        const el = document.createElement('div')
        el.className = 'custom-home-marker'
        el.style.cssText = `
          width: 50px;
          height: 50px;
          cursor: pointer;
          position: absolute;
          transform: translate(-50%, -50%);
          pointer-events: auto;
        `
        
        // Create tooltip element
        const tooltip = document.createElement('div')
        tooltip.className = 'property-tooltip'
        tooltip.style.cssText = `
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-8px);
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          padding: 12px 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s ease, transform 0.3s ease;
          z-index: 1000;
          min-width: 220px;
          white-space: nowrap;
        `
        
        tooltip.innerHTML = `
          <div style="font-weight: 700; color: #1e293b; font-size: 14px; margin-bottom: 6px; line-height: 1.3;">${escapeHTML(property.name)}</div>
          <div style="color: #2563eb; font-weight: 600; font-size: 13px; margin-bottom: 4px;">₱${property.price?.toLocaleString()}/month</div>
          <div style="color: #64748b; font-size: 12px; margin-bottom: 2px; display: flex; align-items: center; gap: 4px;">
            <span style="font-size: 10px;">📍</span>
            <span>${escapeHTML(property.location.address)}</span>
          </div>
          ${distanceText ? `<div style="color: #10b981; font-size: 12px; font-weight: 600; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
            <span style="font-size: 10px;">🧭</span>
            <span>${escapeHTML(distanceText)}</span>
          </div>` : ''}
        `
        
        el.appendChild(tooltip)
        
        // Create inner circle that will have the hover effect
        const inner = document.createElement('div')
        inner.style.cssText = `
          width: 100%;
          height: 100%;
          background-color: ${markerColor};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          border: 3px solid white;
        `
        
        // Add home icon SVG to inner element
        inner.innerHTML = `
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        `
        
        el.appendChild(inner)
        
        // Add hover effect to inner element and show tooltip
        el.addEventListener('mouseenter', () => {
          inner.style.transform = 'scale(1.15)'
          inner.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.3)'
          tooltip.style.opacity = '1'
          tooltip.style.transform = 'translateX(-50%) translateY(-12px)'
        })
        el.addEventListener('mouseleave', () => {
          inner.style.transform = 'scale(1)'
          inner.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)'
          tooltip.style.opacity = '0'
          tooltip.style.transform = 'translateX(-50%) translateY(-8px)'
        })

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([property.location.longitude, property.location.latitude])
          .addTo(map)

        marker.getElement().addEventListener('click', async () => {
          setSelectedProperty(property)
          map.flyTo({ 
            center: [property.location.longitude, property.location.latitude], 
            zoom: 16, 
            speed: 1.2, 
            curve: 1.4 
          })
          
          if (userLocation) {
            try { 
              await drawDirections(map, [userLocation.lng, userLocation.lat], [property.location.longitude, property.location.latitude])
              
              // If navigation mode is requested, get turn-by-turn directions
              if (navigationMode) {
                await getTurnByTurnDirections([userLocation.lng, userLocation.lat], [property.location.longitude, property.location.latitude])
              }
            } catch (e) { 
              console.warn('Could not draw directions:', e) 
            }
          } else {
            console.log('User location unknown. Click the geolocate button or allow location access to get directions.')
          }
        })

        markersRef.current.push(marker)
      } catch (err) {
        console.error(`Error adding marker for ${property.name}:`, err)
      }
    })
    if (skipped.length > 0) console.warn('Skipped properties with invalid coords:', skipped)
    console.log(`🗺️ Added ${markersRef.current.length} markers (${filteredProperties.length} properties + ${focusOnProperty ? 0 : (userLocation ? 1 : 0)} user location)`)
  }, [clearMarkers, userLocation, drawDirections, focusOnProperty, enableClustering, mlProperties.length, selectedCluster, navigationMode, onNavigationToggle, getTurnByTurnDirections]) // Added missing callbacks

  


  // Initialize map once
  useEffect(() => {
    if (!mapRef.current) { console.log("🚨 Map container ref not available"); return }

    let mounted = true
    let loadTimeout: NodeJS.Timeout

    const initMap = async () => {
      try {
        console.log("🗺️ Starting map initialization...")
        console.log("🗺️ Token:", mapboxgl.accessToken ? "✅ Available" : "❌ Missing")
        console.log("🗺️ Center:", center, "Zoom:", zoom, "Properties:", properties.length)

        setIsLoading(true)
        setError(null)

        // Early return if already initialized
        if (initializedRef.current && mapInstanceRef.current) {
          console.log("🔁 Map already initialized - skipping")
          setIsLoading(false)
          return
        }

        // Check for required token
        if (!mapboxgl.accessToken) {
          console.error("❌ Missing Mapbox access token")
          setError("Missing Mapbox access token")
          setIsLoading(false)
          return
        }

        // Set timeout for loading
        loadTimeout = setTimeout(() => {
          if (mounted) { 
            console.log("⏰ Map load timeout after 10 seconds")
            setError("Map loading timeout - please refresh")
            setIsLoading(false) 
          }
        }, 10000) // Reduced from 15 to 10 seconds

        const map = new mapboxgl.Map({
          container: mapRef.current!,
          style: "mapbox://styles/mapbox/streets-v12",
          center,
          zoom,
          attributionControl: true,
          logoPosition: 'bottom-right',
          // Add retry logic
          maxTileCacheSize: 50,
          refreshExpiredTiles: true
        })

        console.log("🗺️ Map instance created successfully!")
        console.log("📦 Map container ID:", map.getContainer().id)
        const cont = map.getContainer() as HTMLElement
        console.log("📐 Container dimensions:", {
          width: cont.clientWidth,
          height: cont.clientHeight,
          offsetWidth: cont.offsetWidth,
          offsetHeight: cont.offsetHeight
        })

        // Check if container has size
        if (cont.clientWidth === 0 || cont.clientHeight === 0) {
          console.warn("⚠️ Map container has no size! This may cause rendering issues.")
        }

        map.addControl(new mapboxgl.NavigationControl(), 'top-right')
        map.addControl(new mapboxgl.FullscreenControl(), 'top-right')

        const geolocate = new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserHeading: true, showAccuracyCircle: true, fitBoundsOptions: { maxZoom: 15 } })
        map.addControl(geolocate, 'top-right')

        map.on("load", () => {
          if (!mounted) return
          console.log("🎉 Map loaded successfully!")
          clearTimeout(loadTimeout)
          
          // Set loaded state
          setIsLoading(false)
          initializedRef.current = true
          loadedRef.current = true
          
          // Add markers with delay to prevent conflicts
          setTimeout(() => {
            if (mounted && mapInstanceRef.current) {
              addMarkersToMap(mapInstanceRef.current, propertiesRef.current)
            }
          }, 500)

          // Resize and recenter
          try {
            if (map && typeof map.resize === 'function') {
              map.resize()
              requestAnimationFrame(() => {
                if (map && typeof map.resize === 'function') {
                  map.resize()
                  // If focusing on a single property, center the map after resize
                  if (focusOnProperty && properties.length === 1) {
                    setTimeout(() => {
                      map.easeTo({ 
                        center: [properties[0].location.longitude, properties[0].location.latitude], 
                        zoom: 16,
                        duration: 500
                      })
                    }, 100)
                  }
                }
              })
            }
          } catch (error) {
            console.warn("⚠️ Map resize failed:", error)
          }
          
          const el = map.getContainer() as HTMLElement
          console.log("📐 Container size (after load):", el.clientWidth, "x", el.clientHeight)

          // Background layer
          try {
            const style = map.getStyle()
            const bgLayer = style.layers?.find(l => l.type === 'background')
            if (bgLayer) { map.setPaintProperty(bgLayer.id, 'background-color', '#eef2ff') }
            else {
              const firstLayerId = style.layers && style.layers.length > 0 ? style.layers[0].id : undefined
              map.addLayer({ id: 'bg-layer', type: 'background', paint: { 'background-color': '#eef2ff' } }, firstLayerId)
            }
          } catch (bgErr) { console.warn('Could not set background layer:', bgErr) }

          // Simple container size check
          const containerCheck = () => {
            const c = map.getContainer() as HTMLElement
            const w = c.clientWidth; const h = c.clientHeight
            if (w > 0 && h > 0) {
              console.log("✅ Container ready:", w, "x", h)
              try {
                if (map && typeof map.resize === 'function') {
                  map.resize()
                  map.easeTo({ center, zoom, duration: 0 })
                }
              } catch (error) {
                console.warn("⚠️ Map resize/easeTo failed:", error)
              }
              
              // Only fly to user location if not focusing on a specific property
              if (userLocation && !focusOnProperty) {
                setTimeout(() => {
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo({ 
                      center: [userLocation.lng, userLocation.lat], 
                      zoom: Math.max(14, zoom), 
                      speed: 1.2 
                    })
                  }
                }, 2000) // Longer delay to ensure stability
              }
            } else {
              console.log("⏳ Container not ready, retrying...")
              setTimeout(containerCheck, 200)
            }
          }
          
          setTimeout(containerCheck, 100)
        })

        // Fallback: Use 'idle' event if 'load' never fires
        map.on("idle", () => {
          if (!mounted) return
          if (!loadedRef.current) { 
            console.log("✅ Map idle event fired (fallback) - marking as loaded"); 
            clearTimeout(loadTimeout); 
            setIsLoading(false); 
            initializedRef.current = true; 
            loadedRef.current = true 
          }
        })

        // Final fallback timeout - force loading to complete
        setTimeout(() => {
          if (mounted && !loadedRef.current) {
            console.log("⏰ Final fallback (5s) - forcing map to finish loading")
            clearTimeout(loadTimeout)
            setIsLoading(false)
            initializedRef.current = true
            loadedRef.current = true
          }
        }, 5000) // 5 second final fallback

        map.on("error", (e) => {
          if (!mounted) return
          console.error("🚨 Map error:", e.error)
          console.error("🚨 Error details:", {
            message: e.error?.message,
            status: (e.error as any)?.status,
            url: (e.error as any)?.url
          })
          clearTimeout(loadTimeout)
          
          // Provide more helpful error messages
          let errorMessage = "Map error occurred"
          if (e.error?.message) {
            errorMessage = e.error.message
            
            // Add helpful hints for common errors
            if (e.error.message.includes('401') || e.error.message.includes('Unauthorized')) {
              errorMessage += ". Your Mapbox token may be invalid or expired."
            } else if (e.error.message.includes('network') || e.error.message.includes('Failed to fetch')) {
              errorMessage += ". Please check your internet connection."
            } else if (e.error.message.includes('style')) {
              errorMessage += ". Map style failed to load."
            }
          }
          
          setError(errorMessage)
          setIsLoading(false)
        })

        map.on("styledata", () => { console.log("🎨 Map style loaded") })
        map.on("sourcedata", (e: any) => { if (e.isSourceLoaded) console.log("📊 Map source data loaded") })

        mapInstanceRef.current = map

        // Observers
        if (mapRef.current && typeof ResizeObserver !== 'undefined') {
          resizeObserverRef.current = new ResizeObserver(() => { 
            try {
              if (mapInstanceRef.current && typeof mapInstanceRef.current.resize === 'function') {
                mapInstanceRef.current.resize()
              }
            } catch (error) {
              console.warn("⚠️ Map resize failed in ResizeObserver:", error)
            }
          })
          resizeObserverRef.current.observe(mapRef.current)
        }
        if (mapRef.current && typeof IntersectionObserver !== 'undefined') {
          intersectionObserverRef.current = new IntersectionObserver((entries) => {
            const entry = entries[0]
            if (entry && entry.isIntersecting && mapInstanceRef.current) { 
              console.log("👀 Map container became visible - resizing map")
              try {
                if (typeof mapInstanceRef.current.resize === 'function') {
                  mapInstanceRef.current.resize()
                }
              } catch (error) {
                console.warn("⚠️ Map resize failed in IntersectionObserver:", error)
              }
            }
          }, { threshold: 0.1 })
          intersectionObserverRef.current.observe(mapRef.current)
        }

        // Window events
        const onWindowResize = () => {
          try {
            if (map && typeof map.resize === 'function') {
              map.resize()
            }
          } catch (error) {
            console.warn("⚠️ Map resize failed on window resize:", error)
          }
        }
        const onVisibility = () => {
          try {
            if (map && typeof map.resize === 'function') {
              map.resize()
            }
          } catch (error) {
            console.warn("⚠️ Map resize failed on visibility change:", error)
          }
        }
        window.addEventListener('resize', onWindowResize)
        document.addEventListener('visibilitychange', onVisibility)
        document.addEventListener('fullscreenchange', onVisibility)
        ;(map as any)._customCleanup = () => {
          window.removeEventListener('resize', onWindowResize)
          document.removeEventListener('visibilitychange', onVisibility)
          document.removeEventListener('fullscreenchange', onVisibility)
        }
      } catch (err) {
        if (!mounted) return
        console.error("🚨 Error initializing map:", err)
        clearTimeout(loadTimeout)
        setError(`Failed to initialize map: ${err instanceof Error ? err.message : "Unknown error"}`)
        setIsLoading(false)
      }
    }

    const timeoutId = setTimeout(initMap, 100)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      if (loadTimeout) clearTimeout(loadTimeout)
      clearMarkers()
      if (mapInstanceRef.current) {
        const anyMap = mapInstanceRef.current as any
        if (anyMap._customCleanup) anyMap._customCleanup()
        try { clearRoute(mapInstanceRef.current) } catch {}
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      if (resizeObserverRef.current) { try { resizeObserverRef.current.disconnect() } catch {} ; resizeObserverRef.current = null }
      if (intersectionObserverRef.current) { try { intersectionObserverRef.current.disconnect() } catch {} ; intersectionObserverRef.current = null }
      initializedRef.current = false
      loadedRef.current = false
    }
  }, [center, zoom, properties.length]) // Simplified dependencies - removed callbacks that cause infinite loops

  // Respond to center/zoom changes without re-initializing the map
  useEffect(() => { if (mapInstanceRef.current) mapInstanceRef.current.easeTo({ center, zoom, duration: 500 }) }, [center, zoom])

  // Update markers when properties change
  useEffect(() => { 
    if (mapInstanceRef.current && !isLoading && !error) {
      addMarkersToMap(mapInstanceRef.current, properties) 
    }
  }, [properties.length, mlProperties.length, selectedCluster, enableClustering, isLoading, error]) // Simplified dependencies

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: modernStyles }} />
      <div className="relative w-full h-full rounded-3xl flex overflow-hidden gradient-bg shadow-2xl border border-white/30 backdrop-blur-sm animate-fade-in" style={{ minHeight: "300px" }}>
      {/* Optimized Navigation Panel */}
      {navigationMode && routeSteps.length > 0 && (
        <div className="w-80 section-card border-r border-gray-200 overflow-y-auto modern-scrollbar animate-slide-up">
          <div className="p-4">
            {/* Compact Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="icon-nav text-white text-sm"></span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Navigation</h2>
                  <p className="text-xs text-gray-500">{routeSteps.length} steps</p>
                </div>
              </div>
              <button
                onClick={() => onNavigationToggle && onNavigationToggle(false)}
                className="modern-button w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg flex items-center justify-center"
                aria-label="Close navigation"
              >
                <span className="icon-close text-sm"></span>
              </button>
              {/* (Send Now button removed from Navigation) */}
            </div>

            {/* Send Now confirmation modal */}
            {confirmPayload && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmPayload(null)}></div>
                <div className="relative z-10 max-w-md w-full p-4 glass-panel rounded-xl shadow-xl">
                  <h3 className="text-lg font-semibold mb-2">Confirm message</h3>
                  <p className="text-sm text-slate-700 mb-3">This message will be sent to the owner:</p>
                  <div className="mb-4 p-3 bg-white/60 rounded text-sm text-slate-800">{confirmPayload.prefill}</div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setConfirmPayload(null)}
                      className="px-3 py-2 rounded-lg bg-gray-200 text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => { await doSendNow() }}
                      disabled={isSendingNow}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${isSendingNow ? 'bg-amber-300 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
                    >
                      {isSendingNow ? 'Sending…' : 'Send now'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Compact Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">Step {currentStep + 1}/{routeSteps.length}</span>
                <span className="text-xs text-gray-500">{Math.round(((currentStep + 1) / routeSteps.length) * 100)}%</span>
              </div>
              <div className="progress-bar h-2">
                <div 
                  className="progress-fill h-2" 
                  style={{ width: `${((currentStep + 1) / routeSteps.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Compact Current Step */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">{currentStep + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight mb-2">
                    {routeSteps[currentStep]?.instruction}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-blue-700">
                      📏 {Math.round(routeSteps[currentStep]?.distance || 0)}m
                    </span>
                    <span className="text-xs text-blue-700">
                      ⏱ {Math.round((routeSteps[currentStep]?.duration || 0) / 60)} min
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Compact Next Step Preview */}
            {currentStep < routeSteps.length - 1 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs">{currentStep + 2}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Next</p>
                    <p className="text-sm font-medium text-gray-700 leading-tight mb-1">
                      {routeSteps[currentStep + 1]?.instruction}
                    </p>
                    <span className="text-xs text-gray-500">
                      {Math.round(routeSteps[currentStep + 1]?.distance || 0)}m • {Math.round((routeSteps[currentStep + 1]?.duration || 0) / 60)} min
                    </span>
                  </div>
                  <span className="text-sm flex-shrink-0">
                    {getDirectionIcon(routeSteps[currentStep + 1]?.type, routeSteps[currentStep + 1]?.modifier)}
                  </span>
                </div>
              </div>
            )}

            {/* Compact Final Destination Info */}
            {currentStep === routeSteps.length - 1 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">🏁</span>
                  <div>
                    <p className="text-sm font-semibold text-green-900">Arrived!</p>
                    <p className="text-xs text-green-700">Destination reached</p>
                  </div>
                </div>
              </div>
            )}

            {/* Compact Destination Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-blue-600 text-sm">🏠</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-blue-900 truncate">
                      {selectedProperty?.name || 'Selected Property'}
                    </p>
                  </div>
                </div>
                {routeInfo && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-blue-900">
                      {routeInfo.distanceKm.toFixed(1)} km
                    </p>
                    <p className="text-xs text-blue-700">
                      {Math.round(routeInfo.durationMin)} min
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Compact Controls */}
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="modern-button flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <button
                onClick={() => setCurrentStep(Math.min(routeSteps.length - 1, currentStep + 1))}
                disabled={currentStep === routeSteps.length - 1}
                className="modern-button flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentStep === routeSteps.length - 1 ? 'Done' : 'Next →'}
              </button>
            </div>

            {/* Quick Jump */}
            {currentStep < routeSteps.length - 1 && (
              <button
                onClick={() => setCurrentStep(routeSteps.length - 1)}
                className="modern-button w-full px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition-all duration-300"
              >
                🏁 Jump to End
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Map Container */}
      <div className={`relative rounded-lg transition-all duration-300 ${
        (selectedProperty && navigationMode && routeSteps.length > 0) ? 'flex-1' : // Both panels open (640px used)
        (selectedProperty || (navigationMode && routeSteps.length > 0)) ? 'flex-1' : // One panel open (320px used)
        'w-full' // No panels open
      }`} style={{ minHeight: "300px" }}>
        
        {/* Cluster Controls - Hide when focusing on single property */}
        {enableClustering && staticLabels.length > 0 && !focusOnProperty && (
          <div className="absolute top-3 sm:top-6 left-3 sm:left-6 z-20 flex flex-wrap gap-2 sm:gap-3 max-w-[calc(100%-1.5rem)] sm:max-w-none">
            {staticLabels.map((name, idx) => (
              <button
                key={name}
                onClick={() => onClusterChange && onClusterChange(idx)}
                className={`
                  modern-button px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 transform backdrop-blur-md shadow-lg border whitespace-nowrap
                  ${selectedCluster === idx 
                    ? 'text-white shadow-xl scale-105 border-white/30' 
                    : 'glass-panel text-slate-700 hover:bg-white hover:shadow-xl hover:scale-105 border-white/50'
                  }
                `}
                style={{
                  backgroundColor: selectedCluster === idx ? staticColors[idx] : undefined
                }}
                title={idx === 0 ? 'Budget Properties (₱1-3k)' : idx === 1 ? 'Standard Properties (₱3-8k)' : idx === 2 ? 'Premium Properties (₱8k+)' : 'All Properties'}
              >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg">
                  {idx === 0 ? '💰' : idx === 1 ? '🏠' : idx === 2 ? '💎' : '🌐'}
                </span>
                <span>{name}</span>
              </div>
            </button>
          ))}
        </div>
      )}
          

      {/* Modern Loading indicator for ML clusters - Hide when focusing on single property */}
      {loadingML && enableClustering && !focusOnProperty && (
        <div className="absolute top-6 right-6 z-20 glass-panel px-5 py-3 rounded-2xl shadow-xl border border-white/50 text-sm text-slate-700 flex items-center gap-3 animate-slide-up">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-200 border-t-blue-500"></div>
          <span className="font-medium">Loading clusters...</span>
        </div>
      )}

      {/* Modern Route info overlay - Hide when focusing on single property */}
      {routeInfo && !focusOnProperty && (
        <div className="absolute bottom-6 left-6 z-10 glass-panel px-5 py-4 rounded-2xl shadow-xl border border-white/50 text-sm text-slate-700 animate-scale-in">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                <span className="text-blue-600 text-sm">🧭</span>
              </div>
              <span className="font-semibold text-slate-800">{routeInfo.distanceKm.toFixed(1)} km</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                <span className="text-green-600 text-sm">⏱</span>
              </div>
              <span className="font-semibold text-slate-800">{Math.round(routeInfo.durationMin)} min</span>
            </div>
            <button
              onClick={() => { setRouteInfo(null); if (mapInstanceRef.current) clearRoute(mapInstanceRef.current) }}
              className="modern-button ml-2 w-10 h-10 text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-xl flex items-center justify-center transition-all duration-300"
              aria-label="Clear route"
              title="Clear route"
            >✖</button>
          </div>
        </div>
      )}

      <div ref={mapRef} className="absolute inset-0 rounded-3xl overflow-hidden" style={{ backgroundColor: "#f8fafc", minHeight: "600px" }} />

      {/* Modern Enhanced controls section - Hide all when focusing on single property */}
      {!focusOnProperty && (
        <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-3 animate-slide-up">
          {/* Modern My Location buttons */}
          <div className="flex flex-col gap-2">
            <button
              aria-label="My location"
              title="Go to my location"
              onClick={() => { if (mapInstanceRef.current && userLocation) mapInstanceRef.current.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 15, speed: 1.2 }) }}
              className="modern-button inline-flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl glass-panel hover:bg-white text-slate-700 border border-white/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              disabled={!userLocation}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                <span className="text-sm">📍</span>
              </div>
              <span className="text-sm font-semibold">My location</span>
            </button>
            
            <button
              aria-label="Refresh location"
              title="Refresh my location for better accuracy"
              onClick={() => {
                console.log("🔄 Manually refreshing location...")
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      const newLocation = { 
                        lat: position.coords.latitude, 
                        lng: position.coords.longitude 
                      }
                      setUserLocation(newLocation)
                      setLocationAccuracy(position.coords.accuracy)
                      console.log("✅ Manual location refresh:", newLocation, "Accuracy:", position.coords.accuracy + "m")
                      
                      // Fly to the new location
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo({ 
                          center: [newLocation.lng, newLocation.lat], 
                          zoom: 15, 
                          speed: 1.2 
                        })
                      }
                    },
                    (error) => {
                      console.error("❌ Manual location refresh failed:", error.message)
                      alert("Could not refresh location. Please check your browser's location permissions.")
                    },
                    { 
                      enableHighAccuracy: true, 
                      timeout: 10000, 
                      maximumAge: 0 // Force fresh location
                    }
                  )
                }
              }}
              className="modern-button inline-flex items-center gap-3 px-3 py-2 rounded-2xl shadow-lg glass-panel hover:bg-white text-slate-700 border border-white/50 text-sm transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="w-6 h-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                <span className="text-xs">🔄</span>
              </div>
              <span className="font-semibold">Refresh GPS</span>
            </button>
          </div>

          {/* Modern Navigation toggle button */}
          <button
            onClick={() => onNavigationToggle && onNavigationToggle(!navigationMode)}
            className={`modern-button inline-flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border transition-all duration-300 text-sm font-semibold backdrop-blur-md hover:scale-105 hover:shadow-2xl ${
              navigationMode 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-white/30 hover:from-blue-600 hover:to-indigo-700' 
                : 'glass-panel hover:bg-white text-slate-700 border-white/50'
            }`}
            disabled={!selectedProperty || !routeInfo}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center">
              <span className="text-indigo-600 text-sm">🧭</span>
            </div>
            <span>{navigationMode ? 'Stop Navigation' : 'Start Navigation'}</span>
          </button>

          {/* Modern Refresh ML clusters button */}
          <button
            onClick={fetchMLClusters}
            disabled={loadingML}
            className="modern-button inline-flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl glass-panel hover:bg-white text-slate-700 border border-white/50 disabled:opacity-50 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
          >
            <div className={`w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center ${loadingML ? 'animate-spin' : ''}`}>
              <span className="text-purple-600 text-sm">🔄</span>
            </div>
            <span className="text-sm font-semibold">Refresh ML</span>
          </button>
        </div>
      )}

      {/* Modern Location accuracy indicator */}
      {userLocation && locationAccuracy && !focusOnProperty && !routeInfo && (
        <div className="absolute bottom-20 left-6 z-10 glass-panel px-4 py-3 rounded-2xl shadow-xl border border-white/50 text-sm text-slate-700 animate-scale-in">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full shadow-sm ${
              locationAccuracy <= 20 ? 'bg-green-500' : 
              locationAccuracy <= 50 ? 'bg-yellow-500' : 
              locationAccuracy <= 100 ? 'bg-orange-500' : 'bg-red-500'
            }`}></div>
            <span className="font-semibold">
              GPS: {locationAccuracy.toFixed(0)}m accuracy
            </span>
            <span className="text-xs text-slate-500 px-3 py-1 glass-panel rounded-xl">
              {locationAccuracy <= 20 ? '(Excellent)' : 
               locationAccuracy <= 50 ? '(Good)' : 
               locationAccuracy <= 100 ? '(Fair)' : '(Poor)'}
            </span>
          </div>
        </div>
      )}

      {/* Cluster stats overlay - Already hidden when focusOnProperty is true */}
      {enableClustering && mlProperties.length > 0 && !focusOnProperty && !routeInfo && (
        <div className="absolute bottom-6 left-6 z-10 glass-panel px-4 py-3 rounded-2xl shadow border border-white/30 text-sm text-slate-700 animate-scale-in">
          <div className="flex items-center gap-2">
            <span className="font-medium">{staticLabels[selectedCluster]} Properties:</span>
            <span className="font-bold text-gradient">{mlProperties.filter(p => p.cluster === getClusterMapping(mlProperties)[selectedCluster]).length}</span>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center gradient-bg backdrop-blur-lg rounded-3xl animate-fade-in">
          <div className="text-center p-8 glass-panel rounded-3xl shadow-2xl border border-white/50 animate-scale-in">
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 to-indigo-400/20 animate-pulse"></div>
            </div>
            <h3 className="text-xl font-bold text-gradient mb-2">Loading Map</h3>
            <p className="text-slate-600 mb-1">Initializing interactive experience...</p>
            <p className="text-sm text-slate-500 mb-6">
              Preparing {enableClustering ? `${mlProperties.length} clustered` : properties.length} properties
            </p>
            <div className="flex justify-center">
              <button 
                onClick={() => { setIsLoading(false); setError("Loading cancelled by user") }} 
                className="modern-button text-sm text-slate-400 hover:text-slate-600 hover:bg-white/50 px-4 py-2 rounded-xl transition-all duration-300"
              >
                Cancel and show fallback
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-50/95 to-white/95 backdrop-blur-lg rounded-3xl animate-fade-in">
          <div className="text-center p-8 glass-panel rounded-3xl shadow-2xl border border-red-200/50 max-w-md animate-scale-in">
            <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">🗺️</span>
            </div>
            <h3 className="text-xl font-bold text-red-900 mb-2">Map Error</h3>
            <p className="text-slate-600 mb-4 leading-relaxed">{error}</p>
            <p className="text-sm text-slate-500 mb-6 glass-panel px-4 py-2 rounded-xl">
              Showing {enableClustering ? mlProperties.length : properties.length} properties
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => { setError(null); setIsLoading(true) }} 
                className="modern-button flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl text-sm font-semibold shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                Retry Map
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="modern-button flex-1 px-6 py-3 glass-panel hover:bg-white text-slate-700 rounded-2xl text-sm font-semibold transition-all duration-300 border border-white/50"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Optimized Property Details Panel */}
      {selectedProperty && (
        <div className="w-80 section-card border-l border-gray-200 overflow-y-auto modern-scrollbar animate-slide-up">
          <div className="p-4">
            {/* Compact Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="icon-home text-white text-sm"></span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Property Details</h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedProperty(null)}
                className="modern-button w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg flex items-center justify-center"
                aria-label="Close property details"
              >
                <span className="icon-close text-sm"></span>
              </button>
            </div>

            {/* Compact Property Image */}
            {selectedProperty.images && selectedProperty.images.length > 0 && (
              <div className="relative mb-4 rounded-lg overflow-hidden">
                <img
                  src={selectedProperty.images[0]}
                  alt={selectedProperty.name}
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
                <Badge 
                  className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded capitalize ${
                    selectedProperty.status === 'available' ? 'bg-green-500 text-white' :
                    selectedProperty.status === 'For rent' ? 'bg-blue-500 text-white' :
                    selectedProperty.status === 'For sale' ? 'bg-orange-500 text-white' :
                    'bg-red-500 text-white' // fully booked
                  }`}
                >
                  {selectedProperty.status}
                </Badge>
              </div>
            )}

            {/* Compact Title & Price */}
            <div className="mb-4">
              <h1 className="text-lg font-bold text-gray-900 mb-1 leading-tight">{selectedProperty.name}</h1>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-blue-600">₱{selectedProperty.price.toLocaleString()}</span>
                <span className="text-sm text-gray-500">/month</span>
              </div>
            </div>

            {/* Compact Specifications Grid */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Property Details</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className="icon-home text-blue-600 text-sm"></span>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 capitalize">{selectedProperty.propertyType}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 text-sm">📋</span>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 capitalize">{selectedProperty.status || 'Available'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 text-sm">📅</span>
                  <div>
                    <span className="text-xs text-gray-500">Listed {new Date(selectedProperty.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 text-sm">💰</span>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">₱{selectedProperty.price.toLocaleString()}</span>
                    <span className="text-xs text-gray-500">/mo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Compact Location */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Location</h3>
              <div className="flex items-start gap-2">
                <span className="icon-location text-blue-600 text-sm mt-0.5"></span>
                <span className="text-sm text-gray-700 leading-tight">{selectedProperty.location.address}</span>
              </div>
            </div>

            {/* Compact Description */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">{selectedProperty.description}</p>
            </div>

            {/* Owner Information */}
            {(() => {
              const ownerInfo = getOwnerInfo(selectedProperty)
              if (!ownerInfo) return null
              
              return (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4 mb-4 border border-purple-100">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Property Owner</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 overflow-hidden flex-shrink-0 border-2 border-white shadow-md">
                      {ownerInfo.profilePicture ? (
                        <img 
                          src={ownerInfo.profilePicture} 
                          alt={ownerInfo.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            try {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement
                              if (parent) {
                                // Create fallback element safely without innerHTML
                                const fallback = document.createElement('div');
                                fallback.className = 'w-full h-full flex items-center justify-center text-purple-600 font-bold text-lg';
                                fallback.textContent = ownerInfo.name.charAt(0).toUpperCase();
                                parent.appendChild(fallback);
                              }
                            } catch (err) {
                              console.warn('Owner image fallback failed:', err)
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-purple-600 font-bold text-lg">
                          {ownerInfo.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{ownerInfo.name}</p>
                      {ownerInfo.phone && (
                        <p className="text-xs text-gray-600 truncate">{ownerInfo.phone}</p>
                      )}
                      {ownerInfo.email && (
                        <p className="text-xs text-gray-500 truncate">{ownerInfo.email}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Compact Amenities */}
            {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-1">
                  {selectedProperty.amenities.slice(0, 6).map((amenity: string, index: number) => (
                    <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      <span className="icon-check text-blue-600"></span>
                      {amenity}
                    </span>
                  ))}
                  {selectedProperty.amenities.length > 6 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      +{selectedProperty.amenities.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Compact Route Information */}
            {routeInfo && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <h3 className="text-sm font-semibold text-green-900 mb-2">Distance</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="icon-location text-green-600 text-sm"></span>
                    <span className="text-sm font-semibold text-green-900">{routeInfo.distanceKm.toFixed(1)} km</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="icon-clock text-green-600 text-sm"></span>
                    <span className="text-sm font-semibold text-green-900">{Math.round(routeInfo.durationMin)} min</span>
                  </div>
                </div>
              </div>
            )}

            {/* Compact Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-gray-200">
              <button 
                onClick={async () => {
                  console.log('🔵 Contact Owner button clicked')

                  // Check if user is logged in
                  if (!currentUser) {
                    console.log('❌ User not logged in')
                    alert('Please log in to contact property owners')
                    return
                  }

                  const ownerInfo = getOwnerInfo(selectedProperty)

                  if (!ownerInfo) {
                    console.log('❌ No owner info available')
                    alert('Owner information not available for this property. This may be a demo listing.')
                    return
                  }

                  // If owner has an ID, attempt one-click send (Send Now behavior)
                  if (ownerInfo.id && ownerInfo.id !== 'unknown') {
                    const ownerId = ownerInfo.id
                    const senderId = (currentUser as any)?._id || (currentUser as any)?.id
                    if (!senderId) {
                      alert('Your account ID not found. Please log in again.')
                      return
                    }

                    const prefill = `I want to rent this property: ${selectedProperty.name}`

                    try {
                      await sendMessageAPI(String(senderId), String(ownerId), prefill)
                      try { localStorage.setItem('messages-contact', String(ownerId)) } catch (e) { /* ignore */ }
                      router.push(`/messages?contact=${ownerId}`)
                    } catch (err) {
                      console.error('❌ Send Now failed', err)
                      const message = err instanceof Error ? err.message : String(err)
                      if (message.toLowerCase().includes('auth') || message.toLowerCase().includes('token')) {
                        if (confirm('You need to sign in to message the owner. Would you like to sign in now?')) {
                          router.push('/auth')
                        }
                      } else {
                        alert('Failed to send message. Please try again.')
                      }
                    }
                    return
                  }

                  // Fallbacks: show phone/email if no owner ID
                  if (ownerInfo.phone) {
                    console.log('📱 Showing phone number')
                    alert(`Contact Owner\n\nPhone: ${ownerInfo.phone}\n\nYou can call or text this number to inquire about the property.`)
                    return
                  }

                  if (ownerInfo.email) {
                    console.log('📧 Showing email')
                    alert(`Contact Owner\n\nEmail: ${ownerInfo.email}\n\nYou can email to inquire about the property.`)
                    return
                  }

                  alert('Owner contact information is available. Please check the property details.')
                }}
                className="modern-button flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-1"
              >
                <span className="text-sm">💬</span>
                <span>Contact Owner</span>
              </button>
              <button 
                onClick={() => {
                  const isAvailable = selectedProperty.status === 'available' || selectedProperty.status === 'For rent'
                  if (!isAvailable) {
                    alert('This property is not currently available.')
                    return
                  }

                  if (!currentUser) {
                    alert('Please log in to contact property owners')
                    return
                  }

                  const ownerInfo = getOwnerInfo(selectedProperty)
                  const prefill = `I want to rent this property: ${selectedProperty.name}`

                  if (ownerInfo) {
                    if (ownerInfo.id && ownerInfo.id !== 'unknown') {
                      router.push(`/messages?contact=${ownerInfo.id}&prefill=${encodeURIComponent(prefill)}`)
                    } else if (ownerInfo.phone) {
                      alert(`Contact Owner\n\nPhone: ${ownerInfo.phone}\n\nYou can call or text this number to inquire about the property.`)
                    } else if (ownerInfo.email) {
                      alert(`Contact Owner\n\nEmail: ${ownerInfo.email}\n\nYou can email to inquire about the property.`)
                    } else {
                      alert('Owner contact information is available. Please check the property details.')
                    }
                  } else {
                    alert('Owner information not available for this property.')
                  }
                }}
                className={`modern-button flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-1 ${
                  (selectedProperty.status === 'available' || selectedProperty.status === 'For rent')
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!(selectedProperty.status === 'available' || selectedProperty.status === 'For rent')}
              >
                <span className="icon-heart text-sm"></span>
                <span>{(selectedProperty.status === 'available' || selectedProperty.status === 'For rent') ? 'Book' : 'N/A'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}