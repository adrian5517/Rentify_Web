"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type { Property } from "@/lib/property-data"

// Set your Mapbox access token from environment variable (required)
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiYWRyaWFuNTUxNyIsImEiOiJjbWZkdTg4dmIwMThpMnFyNG10cWJwZjRhIn0.JLRzE6qmyDfePYgSs11ALg'

interface PropertyMapProps {
  properties: Property[]
  clusters?: any[]
  center?: [number, number]
  zoom?: number
  focusOnProperty?: boolean // New prop to indicate if we should focus on a single property
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

export default function PropertyMap({
  properties,
  clusters = [],
  center = [123.1815, 13.6218], // Naga City
  zoom = 13,
  focusOnProperty = false, // Default to false for multiple properties view
}: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null)

  const initializedRef = useRef(false)
  const loadedRef = useRef(false)
  const propertiesRef = useRef<Property[]>(properties)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null)
  const routeSourceId = useRef<string>('route-source')
  const routeLayerId = useRef<string>('route-layer')

  // Keep latest properties reference
  useEffect(() => { propertiesRef.current = properties }, [properties])

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
        },
        (e) => {
          console.log("Location access denied or error:", e)
          setUserLocation({ lat: 13.6218, lng: 123.1815 }) // Fallback to Naga
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      )
    }
  }, [])

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

    // Only add user marker and landmarks if not focusing on a single property
    if (!focusOnProperty) {
      // User marker
      if (userLocation) {
        const userMarker = new mapboxgl.Marker({ color: "#3B82F6", scale: 1.0 })
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

      // Landmarks
      const landmarks: { name: string; coordinates: [number, number]; description: string }[] = [
        { name: "🏛️ Naga City Hall", coordinates: [123.1815, 13.6218], description: "Central Business District" },
        { name: "🎓 Ateneo de Naga University", coordinates: [123.1967, 13.6301], description: "University District" },
        { name: "🏢 SM City Naga", coordinates: [123.1834, 13.6234], description: "Shopping Center" },
        { name: "🏥 Bicol Medical Center", coordinates: [123.1756, 13.6156], description: "Medical District" },
      ]

      landmarks.forEach((lm) => {
        const landmarkMarker = new mapboxgl.Marker({ color: "#dc2626", scale: 0.7 })
          .setLngLat(lm.coordinates)
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-3 text-center font-sans">
              <h3 class="font-bold text-base text-gray-900">${lm.name}</h3>
              <p class="text-sm text-gray-600">${lm.description}</p>
              <p class="text-xs text-gray-500 mt-1">Naga City, Camarines Sur</p>
            </div>
          `))
          .addTo(map)
        markersRef.current.push(landmarkMarker)
      })
    }

    // Property markers
    props.forEach((property: Property) => {
      try {
        let distance = ""
        if (userLocation) {
          const dist = calculateDistance(userLocation.lat, userLocation.lng, property.location.latitude, property.location.longitude)
          distance = ` • ${dist.toFixed(1)}km away`
        }

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
                ${property.amenities.slice(0, 3).map((amenity: string) => `<span class="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">${amenity}</span>`).join('')}
                ${property.amenities.length > 3 ? `<span class="text-xs text-gray-500">+${property.amenities.length - 3} more</span>` : ''}
              </div>
              <div class="flex gap-2">
                <button class="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors">📞 Contact</button>
                <button class="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-200 transition-colors">📅 Book Visit</button>
              </div>
            </div>
          </div>
        `

        const popup = new mapboxgl.Popup({ offset: 25, closeButton: true, closeOnClick: false, maxWidth: "350px", className: "property-popup" }).setHTML(popupContent)

        const markerColor = property.status === "Available" ? "#10b981" : property.status === "Rented" ? "#f59e0b" : "#ef4444"
        const marker = new mapboxgl.Marker({ color: markerColor, scale: 0.9 })
          .setLngLat([property.location.longitude, property.location.latitude])
          .setPopup(popup)
          .addTo(map)

        marker.getElement().addEventListener('click', async () => {
          setSelectedProperty(property)
          map.flyTo({ center: [property.location.longitude, property.location.latitude], zoom: 16, speed: 1.2, curve: 1.4 })
          if (userLocation) {
            try { await drawDirections(map, [userLocation.lng, userLocation.lat], [property.location.longitude, property.location.latitude]) } catch (e) { console.warn('Could not draw directions:', e) }
          } else {
            console.log('User location unknown. Click the geolocate button or allow location access to get directions.')
          }
        })

        markersRef.current.push(marker)
      } catch (err) {
        console.error(`Error adding marker for ${property.name}:`, err)
      }
    })

    console.log(`🗺️ Added ${markersRef.current.length} markers (${props.length} properties + ${focusOnProperty ? 0 : 4} landmarks + ${focusOnProperty ? 0 : (userLocation ? 1 : 0)} user location)`)
  }, [clearMarkers, userLocation, drawDirections, focusOnProperty])

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

        loadTimeout = setTimeout(() => {
          if (mounted) { console.log("⏰ Map load timeout after 15 seconds"); setError("Map loading timeout - please refresh and try again"); setIsLoading(false) }
        }, 15000)

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
          console.log("🎉 Map loaded successfully! Adding markers...")
          clearTimeout(loadTimeout)
          if (!loadedRef.current) { setIsLoading(false); initializedRef.current = true; loadedRef.current = true }
          addMarkersToMap(map, propertiesRef.current)

          // Resize cadence
          map.resize(); requestAnimationFrame(() => map.resize()); setTimeout(() => map.resize(), 300)
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

          // Poll for size until visible
          let attempts = 0
          const maxAttempts = 20
          const interval = setInterval(() => {
            if (!mapInstanceRef.current) { clearInterval(interval); return }
            const c = map.getContainer() as HTMLElement
            const w = c.clientWidth; const h = c.clientHeight
            if (w > 0 && h > 0) {
              clearInterval(interval)
              console.log("✅ Container visible:", w, "x", h, "→ final resize + recenter")
              map.resize()
              map.easeTo({ center, zoom, duration: 0 })
              
              // Only fly to user location if not focusing on a specific property
              if (userLocation && !focusOnProperty) {
                map.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: Math.max(14, zoom), speed: 1.2 })
              }
            } else {
              attempts++
              if (attempts % 2 === 0) console.log(`⏳ Waiting for container size (attempt ${attempts}/${maxAttempts})`)
              map.resize()
              if (attempts >= maxAttempts) { clearInterval(interval); console.warn("⚠️ Container remained 0 size after retries") }
            }
          }, 150)
        })

        map.on("idle", () => {
          if (!mounted) return
          if (!loadedRef.current) { console.log("✅ Map idle - considering loaded"); clearTimeout(loadTimeout); setIsLoading(false); initializedRef.current = true; loadedRef.current = true }
          map.resize()
          const el2 = map.getContainer() as HTMLElement
          console.log("📐 Container size (idle):", el2.clientWidth, "x", el2.clientHeight)
        })

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
  }, [center, zoom, clearMarkers, clearRoute, addMarkersToMap, properties.length, userLocation])

  // Respond to center/zoom changes without re-initializing the map
  useEffect(() => { if (mapInstanceRef.current) mapInstanceRef.current.easeTo({ center, zoom, duration: 500 }) }, [center, zoom])

  // Update markers when properties change
  useEffect(() => { if (mapInstanceRef.current && !isLoading && !error) addMarkersToMap(mapInstanceRef.current, properties) }, [properties, addMarkersToMap, isLoading, error])

  return (
    <div className="relative w-full h-full rounded-lg" style={{ minHeight: "300px" }}>
      {/* Route info overlay */}
      {routeInfo && (
        <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-3 py-2 rounded-md shadow border border-slate-200 text-sm text-slate-700 flex items-center gap-3">
          <span>🧭 {routeInfo.distanceKm.toFixed(1)} km</span>
          <span>⏱ {Math.round(routeInfo.durationMin)} min</span>
          <button
            onClick={() => { setRouteInfo(null); if (mapInstanceRef.current) clearRoute(mapInstanceRef.current) }}
            className="ml-2 text-slate-500 hover:text-slate-700"
            aria-label="Clear route"
            title="Clear route"
          >✖</button>
        </div>
      )}

      <div ref={mapRef} className="absolute inset-0 rounded-lg" style={{ backgroundColor: "#eef2ff", outline: "1px solid rgba(99,102,241,0.25)" }} />

      {/* My Location floating button - only show when not focusing on a single property */}
      {userLocation && !focusOnProperty && (
        <button
          aria-label="My location"
          title="My location"
          onClick={() => { if (mapInstanceRef.current) mapInstanceRef.current.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 15, speed: 1.2 }) }}
          className="absolute z-10 bottom-4 right-4 inline-flex items-center gap-2 px-3 py-2 rounded-md shadow-md bg-white/90 hover:bg-white text-slate-700 border border-slate-200"
        >
          <span>📍</span>
          <span className="text-sm font-medium">My location</span>
        </button>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm rounded-lg">
          <div className="text-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Mapbox...</p>
            <p className="text-xs text-gray-500 mt-1">Initializing map with {properties.length} properties</p>
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
            <p className="text-sm text-gray-500 mb-4">Showing {properties.length} properties</p>
            <div className="space-y-2">
              <button onClick={() => { setError(null); setIsLoading(true) }} className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 mr-2">Retry Map</button>
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">Reload Page</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
