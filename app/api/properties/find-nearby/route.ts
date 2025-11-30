import { NextResponse } from 'next/server'
import { properties } from '@/lib/property-data'

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371 // km
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const lat = Number(url.searchParams.get('lat'))
    const lng = Number(url.searchParams.get('lng'))
    const maxKm = Number(url.searchParams.get('maxKm') || '5')
    const maxPrice = Number(url.searchParams.get('maxPrice') || '999999999')
    const limit = Number(url.searchParams.get('limit') || '50')

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'Missing or invalid lat/lng query params' }, { status: 400 })
    }

    const results = properties
      .map(p => ({
        ...p,
        distanceKm: haversineKm(lat, lng, p.location.latitude, p.location.longitude)
      }))
      .filter(p => p.distanceKm <= maxKm && p.price <= maxPrice)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, Math.max(0, limit))

    return NextResponse.json({ count: results.length, results })
  } catch (err) {
    console.error('find-nearby error', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
