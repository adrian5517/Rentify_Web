
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type { Property } from "@/lib/property-data"

// Set your Mapbox access token
mapboxgl.accessToken = "pk.eyJ1IjoiYWRyaWFuNTUxNyIsImEiOiJjbWZkdWxxaXQwMTd2MmxyNGxkcG9sNzI0In0.m16yaRrCnBmAk3nWvKDz_A"

interface PropertyMapProps {
  properties: Property[]
  clusters?: any[]
  center?: [number, number]
  zoom?: number
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

  // Cleanup markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []
  }, [])

  // Add markers to map
  const addMarkersToMap = useCallback((map: mapboxgl.Map, properties: Property[]) => {
    clearMarkers()
    
    // Add Naga City landmarks
    const landmarks = [
      {
        name: "📍 Naga City Hall",
        coordinates: [123.1815, 13.6218] as [number, number],
        description: "Central Business District"
      },
      {
        name: "🏛️ Ateneo de Naga University",
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
        scale: 0.9
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
    
    // Add property markers
    properties.forEach((property) => {
      try {
        // Create popup content
        const popupContent = `
          <div class="p-3 min-w-[250px] font-sans">
            <h3 class="font-semibold text-lg mb-2 text-gray-900">🏠 ${property.name}</h3>
            <p class="text-lg font-bold text-green-600 mb-2">₱${new Intl.NumberFormat("en-PH").format(property.price)}</p>
            <p class="text-sm text-gray-600 mb-2">📍 ${property.location.address}</p>
            <div class="flex items-center gap-2">
              <span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${property.status}</span>
              <span class="text-xs text-gray-500">${property.amenities.length} amenities</span>
            </div>
          </div>
        `

        // Create popup
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: true,
          closeOnClick: false,
          maxWidth: "320px",
        }).setHTML(popupContent)

        // Create marker with color based on status
        const marker = new mapboxgl.Marker({
          color: property.status === "Available" ? "#10b981" : property.status === "Rented" ? "#f59e0b" : "#ef4444",
          scale: 0.8
        })
          .setLngLat([property.location.longitude, property.location.latitude])
          .setPopup(popup)
          .addTo(map)

        markersRef.current.push(marker)
      } catch (markerError) {
        console.error(`Error adding marker for ${property.name}:`, markerError)
      }
    })

    console.log(`Added ${markersRef.current.length} markers to map (${properties.length} properties + ${landmarks.length} landmarks)`)
  }, [clearMarkers])

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return

    let mounted = true

    const initMap = async () => {
      try {
        console.log("🗺️ Initializing map with:", { center, zoom, propertiesCount: properties.length })
        setIsLoading(true)
        setError(null)

        // Remove existing map instance
        if (mapInstanceRef.current) {
          console.log("🗺️ Removing existing map instance")
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
        }

        console.log("🗺️ Creating new map instance...")
        
        // Create new map instance
        const map = new mapboxgl.Map({
          container: mapRef.current!,
          style: "mapbox://styles/mapbox/streets-v12",
          center: center,
          zoom: zoom,
          attributionControl: true,
        })

        console.log("🗺️ Map instance created, waiting for load event...")

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), 'top-right')

        // Map load event
        map.on("load", () => {
          if (!mounted) return
          console.log("🗺️ Map loaded successfully! Adding markers...")
          setIsLoading(false)
          addMarkersToMap(map, properties)
        })

        // Map error event
        map.on("error", (e) => {
          if (!mounted) return
          console.error("🚨 Map error:", e.error)
          setError(`Map error: ${e.error?.message || "Unknown error"}`)
          setIsLoading(false)
        })

        mapInstanceRef.current = map

      } catch (error) {
        if (!mounted) return
        console.error("🚨 Error initializing map:", error)
        setError(`Failed to initialize map: ${error instanceof Error ? error.message : "Unknown error"}`)
        setIsLoading(false)
      }
    }

    // Add a small delay to ensure DOM is ready
    const timeoutId = setTimeout(initMap, 100)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      clearMarkers()
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [center, zoom, addMarkersToMap])

  // Update markers when properties change
  useEffect(() => {
    if (mapInstanceRef.current && !isLoading && !error) {
      addMarkersToMap(mapInstanceRef.current, properties)
    }
  }, [properties, addMarkersToMap, isLoading, error])

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-100 rounded-lg min-h-[300px]">
        <div className="text-center p-6">
          <div className="text-red-500 mb-2">🗺️ Map Error</div>
          <p className="text-gray-600 mb-2">{error}</p>
          <p className="text-sm text-gray-500">Showing {properties.length} properties</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-50 rounded-lg min-h-[300px]">
        <div className="text-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Mapbox...</p>
          <p className="text-xs text-gray-500 mt-1">Initializing map with {properties.length} properties</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full rounded-lg" 
      style={{ 
        minHeight: "300px",
        position: "relative" 
      }} 
    />
  )
}
