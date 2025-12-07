"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Edit } from 'lucide-react'

interface PropertyItem {
  _id: string
  name: string
  price: number
  images?: string[]
  location?: { address?: string }
}

export default function MyListingsPage() {
  const { user, token } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [properties, setProperties] = useState<PropertyItem[]>([])

  const API_BASE: string = (process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/$/, '')

  useEffect(() => {
    let mounted = true
    async function fetchMyListings() {
      if (!user?._id) return
      setLoading(true)
      setError(null)
      try {
        const endpoints = [
          `/api/properties/user/${user._id}`,
          `${API_BASE}/api/properties/user/${user._id}`
        ]

        let res: Response | null = null
        let data: any = null
        for (const ep of endpoints) {
          try {
            res = await fetch(ep, {
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {})
              }
            })
            if (!res.ok) continue
            data = await res.json()
            break
          } catch (e) {
            // try next
          }
        }

        if (!res || !res.ok) throw new Error('Failed to fetch your listings')

        const results: PropertyItem[] = Array.isArray(data) ? data : (data.properties || data.results || [])
        if (!mounted) return
        setProperties(results)
      } catch (err: any) {
        setError(err?.message || 'Failed to load listings')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchMyListings()
    return () => { mounted = false }
  }, [user?._id, token, API_BASE])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">My Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Please sign in to view and manage your listings.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Listings</h1>
          <p className="text-sm text-slate-600">Manage your rental listings and edit details</p>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-600">{error}</div>
        ) : properties.length === 0 ? (
          <div className="p-6 bg-white rounded shadow text-center">
            <p className="text-sm text-slate-700">You have no active listings yet.</p>
            <Link href="/">
              <Button className="mt-4">Create a Listing</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((p) => (
              <Card key={p._id} className="hover:shadow-lg transition-shadow">
                <div className="h-44 bg-slate-100 rounded-t overflow-hidden">
                  <img src={p.images && p.images.length ? p.images[0] : '/placeholder.jpg'} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg truncate">{p.name}</h3>
                  <p className="text-sm text-slate-600 mt-1">{p.location?.address || ''}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-700 font-semibold">₱{Number(p.price).toLocaleString()}</p>
                    </div>
                    <Link href={`/listings/${p._id}`}>
                      <Button className="flex items-center gap-2" variant="outline">
                        <Edit className="w-4 h-4" /> Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
