"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Edit, Trash2, Plus } from 'lucide-react'
import AddPropertyModal from '@/components/add-property-modal'

interface PropertyItem {
  _id: string
  name: string
  price: number
  images?: string[]
  location?: { address?: string }
}

export default function MyListingsPage() {
  const { user, token } = useAuthStore()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [serverFilteredNotice, setServerFilteredNotice] = useState(false)

  const API_BASE: string = (process.env.NEXT_PUBLIC_API_BASE ?? '').replace(/\/$/, '')

  const fetchMyListings = async () => {
    if (!user?._id) return
    setLoading(true)
    setError(null)
    setServerFilteredNotice(false)
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

      // If the API returned a broad set (or the server ignored the user filter),
      // ensure we only show properties belonging to the current user as a fallback.
      const filtered = results.filter((prop: any) => {
        const ownerIdCandidates = new Set<string>()

        // postedBy may be an id or populated object
        if (prop.postedBy) {
          if (typeof prop.postedBy === 'string') ownerIdCandidates.add(prop.postedBy)
          else if (prop.postedBy._id) ownerIdCandidates.add(prop.postedBy._id)
          else if (prop.postedBy.id) ownerIdCandidates.add(prop.postedBy.id)
        }

        // createdBy may be an id or populated object
        if (prop.createdBy) {
          if (typeof prop.createdBy === 'string') ownerIdCandidates.add(prop.createdBy)
          else if (prop.createdBy._id) ownerIdCandidates.add(prop.createdBy._id)
          else if (prop.createdBy.id) ownerIdCandidates.add(prop.createdBy.id)
        }

        // owner / ownerId / userId legacy fields
        if (prop.owner) {
          if (typeof prop.owner === 'string') ownerIdCandidates.add(prop.owner)
          else if (prop.owner._id) ownerIdCandidates.add(prop.owner._id)
          else if (prop.owner.id) ownerIdCandidates.add(prop.owner.id)
        }
        if (prop.ownerId) ownerIdCandidates.add(prop.ownerId)
        if (prop.userId) ownerIdCandidates.add(prop.userId)
        if (prop.poster) ownerIdCandidates.add(prop.poster)

        // If the API populated user objects with emails, try matching by email as a fallback
        try {
          if (user?.email) {
            if (prop.postedBy && typeof prop.postedBy !== 'string' && prop.postedBy.email === user.email) ownerIdCandidates.add(user._id)
            if (prop.createdBy && typeof prop.createdBy !== 'string' && prop.createdBy.email === user.email) ownerIdCandidates.add(user._id)
          }
        } catch (e) {
          // ignore
        }

        // If no owner info exists, assume it's not owned by user
        if (ownerIdCandidates.size === 0) return false

        return ownerIdCandidates.has(user._id)
      })

      // If server returned extra results (i.e., filtering happened client-side), show a small notice
      if (results.length > filtered.length) {
        setServerFilteredNotice(true)
      }

      setProperties(filtered)
    } catch (err: any) {
      setError(err?.message || 'Failed to load listings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMyListings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, token, API_BASE])

  // Redirect unauthenticated users away from this page so it's not viewable
  useEffect(() => {
    if (!user) {
      // push to homepage (or sign-in route if you prefer)
      router.push('/')
    }
  }, [user, router])

  const handleDelete = async (id: string) => {
    const ok = confirm('Are you sure you want to delete this listing? This cannot be undone.')
    if (!ok) return
    setLoading(true)
    try {
      const endpoints = [`/api/properties/${id}`, `${API_BASE}/api/properties/${id}`]
      let res: Response | null = null
      for (const ep of endpoints) {
        try {
          res = await fetch(ep, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
          })
          if (res.ok) break
        } catch (e) {
          // try next
        }
      }

      if (!res || !res.ok) throw new Error('Failed to delete listing')
      // Refresh list
      await fetchMyListings()
    } catch (err: any) {
      alert(err?.message || 'Failed to delete listing')
    } finally {
      setLoading(false)
    }
  }

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
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-50 py-10">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">My Listings</h1>
            <p className="text-sm text-slate-600 mt-2">Premium dashboard — manage, edit, and publish your rental properties.</p>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 shadow-lg">
              <Plus className="w-4 h-4" /> Add Property
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-600">{error}</div>
        ) : properties.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl shadow-2xl text-center">
            <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 text-left">
                <h2 className="text-2xl md:text-3xl font-extrabold">You don't have any listings yet</h2>
                <p className="text-sm text-slate-600 mt-3">Create a premium listing to showcase your property. Upload photos, set a price, and edit details anytime from this dashboard.</p>

                <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                  <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 shadow-lg">
                    <Plus className="w-4 h-4" /> Add Property
                  </Button>

                  <Link href="/" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full sm:w-auto">Browse Listings</Button>
                  </Link>
                </div>

                <p className="text-xs text-slate-500 mt-4">Tip: You can also scroll the homepage to see live listings and inspiration before creating your own.</p>
              </div>

              <div className="w-full md:w-1/3">
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 shadow-inner flex items-center justify-center">
                  <img src="/placeholder-logo.svg" alt="No listings" className="w-32 h-32 object-contain opacity-80" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {serverFilteredNotice && (
              <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-800 flex items-start justify-between gap-4">
                <div>
                  <strong>Note:</strong> Server returned a broader list — showing only your properties.
                </div>
                <div>
                  <button onClick={() => setServerFilteredNotice(false)} className="text-xs underline text-yellow-800">Dismiss</button>
                </div>
              </div>
            )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((p) => (
              <div key={p._id} className="relative bg-white rounded-2xl shadow-xl overflow-hidden group">
                <div className="relative h-56 sm:h-64 lg:h-56 overflow-hidden">
                  <img src={p.images && p.images.length ? p.images[0] : '/placeholder.jpg'} alt={p.name} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-400" />

                  {/* Price badge */}
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow">
                    <p className="text-sm text-slate-700 font-semibold">₱{Number(p.price).toLocaleString()}</p>
                  </div>

                  {/* Action buttons overlay */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/listings/${p._id}/edit`} className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/90 shadow hover:bg-white" aria-label={`Edit ${p.name}`}>
                      <Edit className="w-4 h-4 text-slate-700" />
                    </Link>
                    <button onClick={() => handleDelete(p._id)} disabled={loading} aria-disabled={loading} className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-5 border-t">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 truncate">{p.name}</h3>
                      <p className="text-sm text-slate-600 mt-1 truncate">{p.location?.address || ''}</p>
                    </div>

                    <div className="hidden sm:flex sm:flex-col items-end">
                      <p className="text-sm text-slate-700 font-semibold">₱{Number(p.price).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Link href={`/listings/${p._id}/edit`}>
                        <Button variant="ghost" className="flex items-center gap-2" disabled={loading} aria-disabled={loading} aria-label={`Edit ${p.name}`}>
                          <Edit className="w-4 h-4" /> Edit
                        </Button>
                      </Link>
                      <Button onClick={() => handleDelete(p._id)} variant="destructive" className="flex items-center gap-2" disabled={loading} aria-disabled={loading}>
                        <Trash2 className="w-4 h-4" /> Delete
                      </Button>
                    </div>

                    <Link href={`/listings/${p._id}`} className="text-sm text-indigo-600 hover:underline">View Details</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}

        {/* Add Property Modal */}
        <AddPropertyModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onPropertyAdded={async () => { setIsAddOpen(false); await fetchMyListings() }} />
      </div>
    </main>
  )
}
