
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type { Property } from "@/lib/property-data"

// Set your Mapbox access token from environment variable (required)
if (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
}

interface PropertyMapProps {
  properties: Property[]
  clusters?: any[]
  center?: [number, number]
  zoom?: number
}

// Helper function to calculate distance using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c // Distance in kilometers
}

export default function PropertyMap({ 
  properties, 
  clusters = [], 
  center = [123.1815, 13.6218], // Naga City Center (Magsaysay Avenue)
  zoom = 13 
}: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const initializedRef = useRef(false)
  const loadedRef = useRef(false)
  const propertiesRef = useRef<Property[]>(properties)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null)

  // Keep latest properties in a ref for use inside event handlers
  useEffect(() => {
    propertiesRef.current = properties
  }, [properties])

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.log("Location access denied or error:", error)
          // Default to Naga City if location access denied
          setUserLocation({ lat: 13.6218, lng: 123.1815 })
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      )
    }
  }, [])

  // Cleanup markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []
  }, [])

  // Add markers to map (adapted from mobile version)
  const addMarkersToMap = useCallback((map: mapboxgl.Map, properties: Property[]) => {
    clearMarkers()
    
    // Add user location marker if available
    if (userLocation) {
      const userMarker = new mapboxgl.Marker({
        color: "#3B82F6", // Blue color for user
        scale: 1.0
      })
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-3 text-center font-sans">
            <h3 class="font-bold text-base text-gray-900">📍 Your Location</h3>
            <p class="text-sm text-gray-600">Current Position</p>
          </div>
        `))
        .addTo(map)
      
      markersRef.current.push(userMarker)
    }

    // Add Naga City landmarks (keeping your landmarks)
    const landmarks = [
      {
        name: "🏛️ Naga City Hall",
        coordinates: [123.1815, 13.6218] as [number, number],
        description: "Central Business District"
      },
      {
        name: "� Ateneo de Naga University",
        coordinates: [123.1967, 13.6301] as [number, number],
        description: "University District"
      },
      {
        name: "🏢 SM City Naga",
        coordinates: [123.1834, 13.6234] as [number, number],
        description: "Shopping Center"
      },
      {
        name: "🏥 Bicol Medical Center",
        coordinates: [123.1756, 13.6156] as [number, number],
        description: "Medical District"
      }
    ]

    // Add landmark markers
    landmarks.forEach((landmark) => {
      const landmarkMarker = new mapboxgl.Marker({
        color: "#dc2626", // Red color for landmarks
        scale: 0.7
      })
        .setLngLat(landmark.coordinates)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-3 text-center font-sans">
            <h3 class="font-bold text-base text-gray-900">${landmark.name}</h3>
            <p class="text-sm text-gray-600">${landmark.description}</p>
            <p class="text-xs text-gray-500 mt-1">Naga City, Camarines Sur</p>
          </div>
        `))
        .addTo(map)
      
      markersRef.current.push(landmarkMarker)
    })
    
    // Add property markers with distance calculation
    properties.forEach((property) => {
      try {
        // Calculate distance if user location is available
        let distance = ""
        if (userLocation) {
          const dist = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            property.location.latitude,
            property.location.longitude
          )
          distance = ` • ${dist.toFixed(1)}km away`
        }

        // Create enhanced popup content (adapted from mobile)
        const popupContent = `
          <div class="p-4 min-w-[280px] font-sans bg-white rounded-lg">
            <div class="mb-3">
              <h3 class="font-bold text-lg text-gray-900 mb-1">🏠 ${property.name}</h3>
              <div class="flex items-center gap-2 mb-2">
                <span class="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">${property.status}</span>
                <span class="text-xs text-gray-500">${property.amenities.length} amenities</span>
              </div>
            </div>
            
            <div class="mb-3">
              <p class="text-xl font-bold text-green-600 mb-1">₱${new Intl.NumberFormat("en-PH").format(property.price)}</p>
              <p class="text-sm text-gray-600 flex items-center">
                <span class="mr-1">📍</span>
                ${property.location.address}${distance}
              </p>
            </div>
            
            <div class="border-t pt-3 mt-3">
              <div class="flex flex-wrap gap-1 mb-3">
                ${property.amenities.slice(0, 3).map(amenity => 
                  `<span class="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">${amenity}</span>`
                ).join('')}
                ${property.amenities.length > 3 ? `<span class="text-xs text-gray-500">+${property.amenities.length - 3} more</span>` : ''}
              </div>
              
              <div class="flex gap-2">
                <button class="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors">
                  📞 Contact
                </button>
                <button class="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-200 transition-colors">
                  📅 Book Visit
                </button>
              </div>
            </div>
          </div>
        `

        // Create popup
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: true,
          closeOnClick: false,
          maxWidth: "350px",
          className: "property-popup"
        }).setHTML(popupContent)

        // Create marker with color based on status (adapted from mobile logic)
        const markerColor = property.status === "Available" ? "#10b981" : 
                           property.status === "Rented" ? "#f59e0b" : "#ef4444"
        
        const marker = new mapboxgl.Marker({
          color: markerColor,
          scale: 0.9
        })
          .setLngLat([property.location.longitude, property.location.latitude])
          .setPopup(popup)
          .addTo(map)

        // Add click event to show property details (similar to mobile handlePropertySelect)
        marker.getElement().addEventListener('click', () => {
          setSelectedProperty(property)
          
          // Animate to property location
          map.flyTo({
            center: [property.location.longitude, property.location.latitude],
            zoom: 16,
            speed: 1.2,
            curve: 1.4
          })
        })

        markersRef.current.push(marker)
      } catch (markerError) {
        console.error(`Error adding marker for ${property.name}:`, markerError)
      }
    })

    console.log(`🗺️ Added ${markersRef.current.length} markers (${properties.length} properties + ${landmarks.length} landmarks + ${userLocation ? 1 : 0} user location)`)
  }, [clearMarkers, userLocation])

  // Initialize map once (enhanced version)
  useEffect(() => {
    if (!mapRef.current) {
      console.log("🚨 Map container ref not available")
      return
    }

    let mounted = true
    let loadTimeout: NodeJS.Timeout

    const initMap = async () => {
      try {
        console.log("🗺️ Starting map initialization...")
        console.log("🗺️ Token:", mapboxgl.accessToken ? "✅ Available" : "❌ Missing")
        console.log("🗺️ Center:", center, "Zoom:", zoom, "Properties:", properties.length)
        
        setIsLoading(true)
        setError(null)

        // If already initialized, just update view and return
        if (initializedRef.current && mapInstanceRef.current) {
          console.log("🔁 Map already initialized - updating view only")
          mapInstanceRef.current.jumpTo({ center, zoom })
          setIsLoading(false)
          return
        }

        if (!mapboxgl.accessToken) {
          console.error("❌ Missing Mapbox access token. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local")
          setError("Missing Mapbox access token. Please set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in .env.local")
          setIsLoading(false)
          return
        }

        // Set timeout for loading issues
        loadTimeout = setTimeout(() => {
          if (mounted) {
            console.log("⏰ Map load timeout after 15 seconds")
            setError("Map loading timeout - please refresh and try again")
            setIsLoading(false)
          }
        }, 15000)

        console.log("🗺️ Creating new map instance...")
        
        // Create new map instance with enhanced settings
        const map = new mapboxgl.Map({
          container: mapRef.current!,
          style: "mapbox://styles/mapbox/streets-v12",
          center: center,
          zoom: zoom,
          attributionControl: true,
          logoPosition: 'bottom-right'
        })

        console.log("🗺️ Map instance created, waiting for load event...")
        const cont = map.getContainer() as HTMLElement
        console.log("📐 Container size (init):", cont.clientWidth, "x", cont.clientHeight)

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), 'top-right')
        
        // Add fullscreen control
        map.addControl(new mapboxgl.FullscreenControl(), 'top-right')

        // Map load event
        map.on("load", () => {
          if (!mounted) return
          console.log("🎉 Map loaded successfully! Adding markers...")
          clearTimeout(loadTimeout)
          if (!loadedRef.current) {
            setIsLoading(false)
            initializedRef.current = true
            loadedRef.current = true
          }
          addMarkersToMap(map, propertiesRef.current)

          // Perform a couple of delayed resizes to account for hidden containers/modals
          map.resize()
          requestAnimationFrame(() => map.resize())
          setTimeout(() => map.resize(), 300)
          const el = map.getContainer() as HTMLElement
          console.log("📐 Container size (after load):", el.clientWidth, "x", el.clientHeight)

          // Ensure a visible base background layer
          try {
            const style = map.getStyle()
            const bgLayer = style.layers?.find(l => l.type === 'background')
            if (bgLayer) {
              map.setPaintProperty(bgLayer.id, 'background-color', '#eef2ff')
            } else {
              const firstLayerId = style.layers && style.layers.length > 0 ? style.layers[0].id : undefined
              map.addLayer({
                id: 'bg-layer',
                type: 'background',
                paint: { 'background-color': '#eef2ff' }
              }, firstLayerId)
            }
          } catch (bgErr) {
            console.warn('Could not set background layer:', bgErr)
          }
        })

        // Also mark loaded on idle as a fallback
        map.on("idle", () => {
          if (!mounted) return
          if (!loadedRef.current) {
            console.log("✅ Map idle - considering loaded")
            clearTimeout(loadTimeout)
            setIsLoading(false)
            initializedRef.current = true
            loadedRef.current = true
          }
          // Ensure layout is correct when tiles/style are fully settled
          map.resize()
          const el2 = map.getContainer() as HTMLElement
          console.log("📐 Container size (idle):", el2.clientWidth, "x", el2.clientHeight)
        })

        // Map error event
        map.on("error", (e) => {
          if (!mounted) return
          console.error("🚨 Map error:", e.error)
          clearTimeout(loadTimeout)
          setError(`Map error: ${e.error?.message || "Unknown error"}`)
          setIsLoading(false)
        })

        // Additional events for debugging
        map.on("styledata", () => {
          console.log("🎨 Map style loaded")
        })

        map.on("sourcedata", (e) => {
          if (e.isSourceLoaded) {
            console.log("📊 Map source data loaded")
          }
        })

        mapInstanceRef.current = map

        // Observe container size changes
        if (mapRef.current && typeof ResizeObserver !== 'undefined') {
          resizeObserverRef.current = new ResizeObserver(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.resize()
            }
          })
          resizeObserverRef.current.observe(mapRef.current)
        }

        // Observe visibility (e.g., when dialog opens)
        if (mapRef.current && typeof IntersectionObserver !== 'undefined') {
          intersectionObserverRef.current = new IntersectionObserver((entries) => {
            const entry = entries[0]
            if (entry && entry.isIntersecting && mapInstanceRef.current) {
              console.log("👀 Map container became visible - resizing map")
              mapInstanceRef.current.resize()
            }
          }, { threshold: 0.1 })
          intersectionObserverRef.current.observe(mapRef.current)
        }

        // Handle window resize and visibility changes
        const onWindowResize = () => map.resize()
        const onVisibility = () => map.resize()
        window.addEventListener('resize', onWindowResize)
        document.addEventListener('visibilitychange', onVisibility)
        document.addEventListener('fullscreenchange', onVisibility)

        // Store cleanup for these listeners
        ;(map as any)._customCleanup = () => {
          window.removeEventListener('resize', onWindowResize)
          document.removeEventListener('visibilitychange', onVisibility)
          document.removeEventListener('fullscreenchange', onVisibility)
        }

      } catch (error) {
        if (!mounted) return
        console.error("🚨 Error initializing map:", error)
        clearTimeout(loadTimeout)
        setError(`Failed to initialize map: ${error instanceof Error ? error.message : "Unknown error"}`)
        setIsLoading(false)
      }
    }

    // Initialize map with slight delay
    const timeoutId = setTimeout(initMap, 100)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      if (loadTimeout) clearTimeout(loadTimeout)
      // Only clean up on unmount
      clearMarkers()
      if (mapInstanceRef.current) {
        // Clean listeners
        const anyMap = mapInstanceRef.current as any
        if (anyMap._customCleanup) anyMap._customCleanup()
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      if (resizeObserverRef.current) {
        try { resizeObserverRef.current.disconnect() } catch {}
        resizeObserverRef.current = null
      }
      if (intersectionObserverRef.current) {
        try { intersectionObserverRef.current.disconnect() } catch {}
        intersectionObserverRef.current = null
      }
      initializedRef.current = false
      loadedRef.current = false
    }
  }, [])

  // Respond to center/zoom changes without re-initializing the map
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.easeTo({ center, zoom, duration: 500 })
    }
  }, [center, zoom])

  // Update markers when properties change
  useEffect(() => {
    if (mapInstanceRef.current && !isLoading && !error) {
      addMarkersToMap(mapInstanceRef.current, properties)
    }
  }, [properties, addMarkersToMap, isLoading, error])

  return (
    <div className="relative w-full h-full rounded-lg" style={{ minHeight: "300px" }}>
      <div 
        ref={mapRef} 
        className="absolute inset-0 rounded-lg"
        style={{ backgroundColor: "#274093ff", outline: "1px solid rgba(99,102,241,0.25)" }}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm rounded-lg">
          <div className="text-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Mapbox...</p>
            <p className="text-xs text-gray-500 mt-1">Initializing map with {properties.length} properties</p>
            <div className="mt-4">
              <button 
                onClick={() => {
                  setIsLoading(false)
                  setError("Loading cancelled by user")
                }}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Cancel and show fallback
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90 rounded-lg">
          <div className="text-center p-6">
            <div className="text-red-500 mb-2">🗺️ Map Error</div>
            <p className="text-gray-600 mb-2">{error}</p>
            <p className="text-sm text-gray-500 mb-4">Showing {properties.length} properties</p>
            <div className="space-y-2">
              <button 
                onClick={() => {
                  setError(null)
                  setIsLoading(true)
                }} 
                className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 mr-2"
              >
                Retry Map
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
