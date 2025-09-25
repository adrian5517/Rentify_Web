"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type { Property } from "@/lib/property-data"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const initializedRef = useRef(false)
  const loadedRef = useRef(false)
  const propertiesRef = useRef<Property[]>(properties)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null)
  const routeSourceId = useRef<string>('route-source')
  const routeLayerId = useRef<string>('route-layer')

  // Keep latest properties reference
  useEffect(() => { propertiesRef.current = properties }, [properties])

  // Static cluster labels and colors for consistent UI
  const staticLabels = ['Low Budget', 'Mid Range', 'High End']
  const staticColors = ['#4CAF50', '#FFC107', '#E91E63']

  // Compute dynamic cluster mapping based on average prices
  const getClusterMapping = useCallback((mlProps: MLProperty[]) => {
    const clusterStats: ClusterStats[] = []
    for (let i = 0; i < 3; i++) {
      const props = mlProps.filter(p => p.cluster === i)
      const avg = props.length ? props.reduce((sum, p) => sum + (p.price || 0), 0) / props.length : 0
      clusterStats.push({ idx: i, avg, count: props.length })
    }
    // Sort clusters by average price ascending
    const sorted = [...clusterStats].sort((a, b) => a.avg - b.avg)
    // Map: clusterMap[buttonIdx] = clusterIndex
    return sorted.map(x => x.idx)
  }, [])

  // Fetch ML clustered properties from API
  const fetchMLClusters = useCallback(async () => {
    if (!enableClustering || !userLocation) return

    setLoadingML(true)
    const price = 2000 // Default price for clustering
    
    try {
      // First fetch all properties to ensure we have complete data
      const fullPropertyRes = await fetch('https://rentify-server-ge0f.onrender.com/api/properties')
      const allProperties = await fullPropertyRes.json()

      // Then get ML recommendations
      const res = await fetch('https://ml-rentify.onrender.com/ml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode: 'kmeans', 
          price, 
          latitude: userLocation.lat,
          longitude: userLocation.lng
        }),
      })
      const mlData = await res.json()
      
      if (Array.isArray(mlData)) {
        // Merge ML recommendations with full property data
        const enrichedData = mlData.map(mlItem => {
          const fullProperty = allProperties.find((p: any) => p._id === mlItem._id)
          if (fullProperty) {
            return {
              ...fullProperty,
              cluster: mlItem.cluster,
              location: fullProperty.location || mlItem.location
            }
          }
          return mlItem
        })
        
        // Fallback: If enrichment failed, use all properties with artificial clusters
        const hasImages = enrichedData.some(item => item.images && item.images.length > 0)
        
        if (!hasImages && allProperties.length > 0) {
          const fallbackData = allProperties.slice(0, 10).map((property: any, index: number) => ({
            ...property,
            cluster: index % 3, // Distribute across 3 clusters
          }))
          setMlProperties(fallbackData)
        } else {
          setMlProperties(enrichedData)
        }
      }
    } catch (error) {
      console.error('Error fetching ML clusters:', error)
      // Fallback to regular properties with artificial clustering
      setMlProperties(properties.map((prop, index) => ({ ...prop, cluster: index % 3 })))
    }
    setLoadingML(false)
  }, [enableClustering, userLocation?.lat, userLocation?.lng]) // Fixed dependency array

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
    const filteredProperties = enableClustering && mlProperties.length > 0 
      ? (() => {
          const clusterMap = getClusterMapping(mlProperties)
          return mlProperties.filter(p => p.cluster === clusterMap[selectedCluster])
        })()
      : activeProperties

    // Only add user marker if not focusing on a single property
    if (!focusOnProperty) {
      // User marker
      if (userLocation) {
        const userMarker = new mapboxgl.Marker({ color: "#3B82F6", scale: 1.0 })
          .setLngLat([userLocation.lng, userLocation.lat])
          .addTo(map)
        markersRef.current.push(userMarker)
      }
    }

    // Property markers
    filteredProperties.forEach((property: MLProperty) => {
      try {
        let distance = ""
        if (userLocation) {
          const dist = calculateDistance(userLocation.lat, userLocation.lng, property.location.latitude, property.location.longitude)
          distance = ` • ${dist.toFixed(1)}km away`
        }

        // Dynamic marker color based on cluster or status
        let markerColor = "#10b981" // Default green
        if (enableClustering && property.cluster !== undefined) {
          markerColor = staticColors[selectedCluster]
        } else {
          markerColor = property.status === "Available" ? "#10b981" : property.status === "Rented" ? "#f59e0b" : "#ef4444"
        }

        const marker = new mapboxgl.Marker({ color: markerColor, scale: 0.9 })
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
          logoPosition: 'bottom-right'
        })

        console.log("🗺️ Map instance created, waiting for load event...")
        const cont = map.getContainer() as HTMLElement
        console.log("📐 Container size (init):", cont.clientWidth, "x", cont.clientHeight)

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
          map.resize()
          requestAnimationFrame(() => map.resize())
          
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
              map.resize()
              map.easeTo({ center, zoom, duration: 0 })
              
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

        map.on("idle", () => {
          if (!mounted) return
          if (!loadedRef.current) { 
            console.log("✅ Map idle - considering loaded"); 
            clearTimeout(loadTimeout); 
            setIsLoading(false); 
            initializedRef.current = true; 
            loadedRef.current = true 
          }
          map.resize()
          const el2 = map.getContainer() as HTMLElement
          console.log("📐 Container size (idle):", el2.clientWidth, "x", el2.clientHeight)
        })

        // Fallback timeout to prevent infinite loading
        setTimeout(() => {
          if (mounted && !loadedRef.current) {
            console.log("⏰ Fallback timeout - forcing map to load")
            setIsLoading(false)
            initializedRef.current = true
            loadedRef.current = true
          }
        }, 10000) // 10 second fallback

        map.on("error", (e) => {
          if (!mounted) return
          console.error("🚨 Map error:", e.error)
          clearTimeout(loadTimeout)
          setError(`Map error: ${e.error?.message || "Unknown error"}`)
          setIsLoading(false)
        })

        map.on("styledata", () => { console.log("🎨 Map style loaded") })
        map.on("sourcedata", (e: any) => { if (e.isSourceLoaded) console.log("📊 Map source data loaded") })

        mapInstanceRef.current = map

        // Observers
        if (mapRef.current && typeof ResizeObserver !== 'undefined') {
          resizeObserverRef.current = new ResizeObserver(() => { if (mapInstanceRef.current) mapInstanceRef.current.resize() })
          resizeObserverRef.current.observe(mapRef.current)
        }
        if (mapRef.current && typeof IntersectionObserver !== 'undefined') {
          intersectionObserverRef.current = new IntersectionObserver((entries) => {
            const entry = entries[0]
            if (entry && entry.isIntersecting && mapInstanceRef.current) { console.log("👀 Map container became visible - resizing map"); mapInstanceRef.current.resize() }
          }, { threshold: 0.1 })
          intersectionObserverRef.current.observe(mapRef.current)
        }

        // Window events
        const onWindowResize = () => map.resize()
        const onVisibility = () => map.resize()
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
    <div className="relative w-full h-full rounded-lg flex" style={{ minHeight: "300px" }}>
      {/* Navigation Panel - moved to left sidebar */}
      {navigationMode && routeSteps.length > 0 && (
        <div className="w-96 bg-gray-50 border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            {/* Close button */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Turn-by-turn Navigation</h2>
              <button
                onClick={() => onNavigationToggle && onNavigationToggle(false)}
                className="text-gray-400 hover:text-gray-600 text-xl p-1 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Close navigation"
              >
                ✕
              </button>
            </div>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-2xl">{getDirectionIcon(routeSteps[currentStep]?.type, routeSteps[currentStep]?.modifier)}</span>
                  Current Step
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Current Step Display */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-medium text-blue-900 mb-2">{routeSteps[currentStep]?.instruction}</p>
                  <div className="flex items-center gap-4 text-sm text-blue-700">
                    <div className="flex items-center gap-1">
                      <span>📏</span>
                      <span>{Math.round(routeSteps[currentStep]?.distance || 0)}m</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>⏱️</span>
                      <span>{Math.round((routeSteps[currentStep]?.duration || 0) / 60)} min</span>
                    </div>
                  </div>
                </div>

                {/* Step Navigation Controls */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ⬅ Previous
                  </button>
                  <button
                    onClick={() => setCurrentStep(Math.min(routeSteps.length - 1, currentStep + 1))}
                    disabled={currentStep === routeSteps.length - 1}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next ➡
                  </button>
                </div>

                {/* All Steps List */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">All Navigation Steps</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {routeSteps.map((step, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentStep(index)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          index === currentStep 
                            ? 'bg-blue-100 border-blue-300 text-blue-900' 
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getDirectionIcon(step.type, step.modifier)}</span>
                          <div className="flex-1">
                            <p className={`text-sm ${index === currentStep ? 'font-medium' : ''}`}>
                              {step.instruction}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {Math.round(step.distance)}m • {Math.round(step.duration / 60)} min
                            </p>
                          </div>
                          {index === currentStep && (
                            <Badge className="bg-blue-600 text-white">Current</Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Main Map Container */}
      <div className={`relative rounded-lg transition-all duration-300 ${
        (selectedProperty && navigationMode && routeSteps.length > 0) ? 'flex-1' : // Both panels open
        (selectedProperty || (navigationMode && routeSteps.length > 0)) ? 'flex-1' : // One panel open
        'w-full' // No panels open
      }`} style={{ minHeight: "300px" }}>
        {/* Cluster Filter Buttons - only show when clustering is enabled */}
        {enableClustering && !focusOnProperty && mlProperties.length > 0 && (
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            {staticLabels.map((name, idx) => (
              <button
                key={name}
                onClick={() => onClusterChange && onClusterChange(idx)}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform
                  ${selectedCluster === idx 
                    ? `bg-${staticColors[idx]?.toLowerCase()}-500 text-white shadow-md scale-105` 
                    : 'bg-white/90 text-gray-700 hover:bg-white shadow-sm hover:shadow-md'
                  }
                `}
                style={{
                  backgroundColor: selectedCluster === idx ? staticColors[idx] : undefined
                }}
              >
              <span className="mr-1">
                {idx === 0 ? '💰' : idx === 1 ? '🏠' : '💎'}
              </span>
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Loading indicator for ML clusters */}
      {loadingML && enableClustering && (
        <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur px-3 py-2 rounded-md shadow border border-slate-200 text-sm text-slate-700 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span>Loading clusters...</span>
        </div>
      )}

      {/* Route info overlay - moved to left side */}
      {routeInfo && (
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur px-4 py-3 rounded-lg shadow-lg border border-slate-200 text-sm text-slate-700">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-blue-600">🧭</span>
              <span className="font-medium">{routeInfo.distanceKm.toFixed(1)} km</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">⏱</span>
              <span className="font-medium">{Math.round(routeInfo.durationMin)} min</span>
            </div>
            <button
              onClick={() => { setRouteInfo(null); if (mapInstanceRef.current) clearRoute(mapInstanceRef.current) }}
              className="ml-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded p-1 transition-colors"
              aria-label="Clear route"
              title="Clear route"
            >✖</button>
          </div>
        </div>
      )}

      <div ref={mapRef} className="absolute inset-0 rounded-lg" style={{ backgroundColor: "#eef2ff", outline: "1px solid rgba(99,102,241,0.25)" }} />

      {/* Enhanced controls section */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        {/* My Location button with refresh capability - only show when not focusing on a single property */}
        {!focusOnProperty && (
          <div className="flex flex-col gap-1">
            <button
              aria-label="My location"
              title="Go to my location"
              onClick={() => { if (mapInstanceRef.current && userLocation) mapInstanceRef.current.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 15, speed: 1.2 }) }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md shadow-md bg-white/90 hover:bg-white text-slate-700 border border-slate-200"
              disabled={!userLocation}
            >
              <span>📍</span>
              <span className="text-sm font-medium">My location</span>
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
              className="inline-flex items-center gap-2 px-2 py-1 rounded-md shadow-sm bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs"
            >
              <span>🔄</span>
              <span>Refresh GPS</span>
            </button>
          </div>
        )}

        {/* Navigation toggle button - always visible */}
        <button
          onClick={() => onNavigationToggle && onNavigationToggle(!navigationMode)}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-md shadow-md border border-slate-200 text-sm font-medium ${
            navigationMode 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-white/90 hover:bg-white text-slate-700'
          }`}
          disabled={!selectedProperty || !routeInfo}
        >
          <span>🧭</span>
          <span>{navigationMode ? 'Stop Navigation' : 'Start Navigation'}</span>
        </button>

        {/* Refresh ML clusters button - always visible */}
        <button
          onClick={fetchMLClusters}
          disabled={loadingML}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md shadow-md bg-white/90 hover:bg-white text-slate-700 border border-slate-200 disabled:opacity-50"
        >
          <span className={loadingML ? 'animate-spin' : ''}>🔄</span>
          <span className="text-sm font-medium">Refresh ML</span>
        </button>
      </div>

      {/* Location accuracy indicator */}
      {userLocation && locationAccuracy && !focusOnProperty && !routeInfo && (
        <div className="absolute bottom-16 left-4 z-10 bg-white/90 backdrop-blur px-3 py-2 rounded-md shadow border border-slate-200 text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              locationAccuracy <= 20 ? 'bg-green-500' : 
              locationAccuracy <= 50 ? 'bg-yellow-500' : 
              locationAccuracy <= 100 ? 'bg-orange-500' : 'bg-red-500'
            }`}></span>
            <span className="font-medium">
              GPS: {locationAccuracy.toFixed(0)}m accuracy
            </span>
            <span className="text-xs text-slate-500">
              {locationAccuracy <= 20 ? '(Excellent)' : 
               locationAccuracy <= 50 ? '(Good)' : 
               locationAccuracy <= 100 ? '(Fair)' : '(Poor)'}
            </span>
          </div>
        </div>
      )}

      {/* Cluster stats overlay */}
      {enableClustering && mlProperties.length > 0 && !focusOnProperty && !routeInfo && (
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur px-3 py-2 rounded-md shadow border border-slate-200 text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <span className="font-medium">{staticLabels[selectedCluster]} Properties:</span>
            <span className="font-bold">{mlProperties.filter(p => p.cluster === getClusterMapping(mlProperties)[selectedCluster]).length}</span>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm rounded-lg">
          <div className="text-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Mapbox...</p>
            <p className="text-xs text-gray-500 mt-1">
              Initializing map with {enableClustering ? `${mlProperties.length} clustered` : properties.length} properties
            </p>
            <div className="mt-4">
              <button onClick={() => { setIsLoading(false); setError("Loading cancelled by user") }} className="text-xs text-gray-400 hover:text-gray-600 underline">Cancel and show fallback</button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90 rounded-lg">
          <div className="text-center p-6">
            <div className="text-red-500 mb-2">🗺️ Map Error</div>
            <p className="text-gray-600 mb-2">{error}</p>
            <p className="text-sm text-gray-500 mb-4">
              Showing {enableClustering ? mlProperties.length : properties.length} properties
            </p>
            <div className="space-y-2">
              <button onClick={() => { setError(null); setIsLoading(true) }} className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 mr-2">Retry Map</button>
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">Reload Page</button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Property Details Panel */}
      {selectedProperty && (
        <div className="w-96 bg-gray-50 border-l border-gray-200 overflow-y-auto">
          <div className="p-4">
            {/* Close button */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Property Details</h2>
              <button
                onClick={() => setSelectedProperty(null)}
                className="text-gray-400 hover:text-gray-600 text-xl p-1 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Close property details"
              >
                ✕
              </button>
            </div>

            <Card className="shadow-lg">
              {/* Property Image */}
              {selectedProperty.images && selectedProperty.images.length > 0 && (
                <div className="relative">
                  <img
                    src={selectedProperty.images[0]}
                    alt={selectedProperty.name}
                    className="w-full h-48 object-cover rounded-t-xl"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder.jpg';
                    }}
                  />
                  <Badge 
                    className={`absolute top-3 right-3 ${
                      selectedProperty.status === 'Available' ? 'bg-green-600 hover:bg-green-700' :
                      selectedProperty.status === 'Rented' ? 'bg-yellow-600 hover:bg-yellow-700' :
                      'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {selectedProperty.status}
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-lg">{selectedProperty.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-600">
                    ₱{selectedProperty.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">/month</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Property Description */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {selectedProperty.description}
                  </p>
                </div>

                {/* Property Specs */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Specifications</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <span className="text-gray-500">🛏️</span>
                      <span className="text-sm font-medium">{selectedProperty.bedrooms} Bedrooms</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <span className="text-gray-500">🚿</span>
                      <span className="text-sm font-medium">{selectedProperty.bathrooms} Bathrooms</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <span className="text-gray-500">🚗</span>
                      <span className="text-sm font-medium">{selectedProperty.parking} Parking</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <span className="text-gray-500">🏠</span>
                      <span className="text-sm font-medium">{selectedProperty.propertyType}</span>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Location</h4>
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <span className="text-blue-500 mt-0.5">📍</span>
                    <span className="text-blue-800 text-sm font-medium">
                      {selectedProperty.location.address}
                    </span>
                  </div>
                </div>

                {/* Amenities */}
                {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProperty.amenities.map((amenity, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Route Information */}
                {routeInfo && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                      <span>🗺️</span>
                      Distance from your location
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 p-2 bg-white/70 rounded-lg">
                        <span className="text-green-600">🛣️</span>
                        <div>
                          <div className="text-sm font-medium text-green-800">{routeInfo.distanceKm.toFixed(1)} km</div>
                          <div className="text-xs text-green-600">Distance</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-white/70 rounded-lg">
                        <span className="text-blue-600">⏱️</span>
                        <div>
                          <div className="text-sm font-medium text-blue-800">{Math.round(routeInfo.durationMin)} min</div>
                          <div className="text-xs text-blue-600">Drive time</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
