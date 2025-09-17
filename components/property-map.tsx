"use client"

import { useEffect, useRef, useState } from "react"
import type { Property } from "@/lib/property-data"

interface PropertyMapProps {
  properties: Property[]
  clusters: any[]
  center?: [number, number]
  zoom?: number
}

export default function PropertyMap({ properties, clusters, center, zoom = 12 }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!mapRef.current) return

    timeoutRef.current = setTimeout(() => {
      if (isLoading) {
        console.log("[v0] Map loading timeout - falling back to property list")
        setError("Map loading timeout")
        setIsLoading(false)
      }
    }, 10000) // 10 second timeout

    const initMap = async () => {
      try {
        console.log("[v0] Starting map initialization...")
        setIsLoading(true)
        setError(null)

        if (!(window as any).mapboxgl) {
          console.log("[v0] Loading Mapbox GL resources...")

          // Load CSS
          const link = document.createElement("link")
          link.href = "https://api.mapbox.com/mapbox-gl-js/v3.1.0/mapbox-gl.css"
          link.rel = "stylesheet"
          document.head.appendChild(link)

          // Load JS with timeout
          await new Promise((resolve, reject) => {
            const script = document.createElement("script")
            script.src = "https://api.mapbox.com/mapbox-gl-js/v3.1.0/mapbox-gl.js"
            script.onload = () => {
              console.log("[v0] Mapbox JS loaded successfully")
              resolve(true)
            }
            script.onerror = () => {
              console.error("[v0] Failed to load Mapbox GL script")
              reject(new Error("Failed to load Mapbox GL"))
            }

            // Add timeout for script loading
            setTimeout(() => {
              reject(new Error("Script loading timeout"))
            }, 5000)

            document.head.appendChild(script)
          })
        }

        const mapboxgl = (window as any).mapboxgl

        if (!mapboxgl) {
          throw new Error("Mapbox GL not available after loading")
        }

        console.log("[v0] Setting access token...")
        mapboxgl.accessToken =
          "pk.eyJ1IjoiYWRyaWFuNTUxNyIsImEiOiJjbWZkdWxxaXQwMTd2MmxyNGxkcG9sNzI0In0.m16yaRrCnBmAk3nWvKDz_A"

        if (mapInstanceRef.current) {
          console.log("[v0] Removing existing map instance")
          mapInstanceRef.current.remove()
        }

        const defaultCenter: [number, number] = center || [123.1815, 13.6218]
        console.log("[v0] Creating map with center:", defaultCenter)

        const map = new mapboxgl.Map({
          container: mapRef.current,
          style: "mapbox://styles/mapbox/streets-v12", // Changed to more reliable style
          center: [defaultCenter[0], defaultCenter[1]],
          zoom: zoom,
        })

        map.on("load", () => {
          console.log("[v0] Map loaded successfully!")
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }
          setIsLoading(false)
          addMarkersToMap(map, properties)
        })

        map.on("style.load", () => {
          console.log("[v0] Map style loaded")
        })

        map.on("sourcedata", (e) => {
          if (e.isSourceLoaded) {
            console.log("[v0] Map source data loaded")
          }
        })

        map.on("error", (e) => {
          console.error("[v0] Map error:", e)
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }
          setError(`Map error: ${e.error?.message || "Unknown error"}`)
          setIsLoading(false)
        })

        mapInstanceRef.current = map
      } catch (error) {
        console.error("[v0] Error initializing map:", error)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        setError(`Unable to load map: ${error instanceof Error ? error.message : "Unknown error"}`)
        setIsLoading(false)
      }
    }

    const addMarkersToMap = (map: any, properties: Property[]) => {
      console.log("[v0] Adding", properties.length, "markers to map")

      properties.forEach((property, index) => {
        try {
          const popup = new (window as any).mapboxgl.Popup({
            offset: 25,
            closeButton: true,
            closeOnClick: true,
            maxWidth: "300px",
          }).setHTML(`
            <div style="padding: 12px; min-width: 200px; font-family: system-ui;">
              <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 4px; color: #1f2937;">${property.name}</h3>
              <p style="color: #1f2937; font-weight: 700; margin-bottom: 4px;">₱${new Intl.NumberFormat("en-PH", {
                minimumFractionDigits: 0,
              }).format(property.price)}</p>
              <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">${property.location.address}</p>
              <span style="display: inline-block; background-color: #1f2937; color: white; font-size: 12px; padding: 4px 8px; border-radius: 4px;">${property.status}</span>
            </div>
          `)
          ;new (window as any).mapboxgl.Marker({
            color: "#1f2937",
          })
            .setLngLat([property.location.longitude, property.location.latitude])
            .setPopup(popup)
            .addTo(map)
        } catch (markerError) {
          console.error(`[v0] Error adding marker ${index}:`, markerError)
        }
      })

      console.log("[v0] All markers added successfully")
    }

    initMap()

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
      }
    }
  }, [properties, center, zoom])

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-lg">
        <div className="text-center p-6">
          <p className="text-muted-foreground mb-2">Map unavailable</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground mt-2">Showing {properties.length} properties in Naga City</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-lg">
        <div className="text-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading map...</p>
          <p className="text-xs text-muted-foreground mt-1">Initializing Mapbox...</p>
        </div>
      </div>
    )
  }

  return <div ref={mapRef} className="w-full h-full rounded-lg" style={{ minHeight: "300px" }} />
}
