"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import config from '@/lib/config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Edit, Trash2, Plus, MapPin, Home, Eye, AlertCircle } from 'lucide-react'
import AddPropertyModal from '@/components/add-property-modal'
import EditListingForm from '@/components/edit-listing-form'

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
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const API_BASE: string = config.API_API

  const fetchMyListings = async () => {
    if (!user?._id || !token) {
      return
    }
    setLoading(true)
    setError(null)
    try {
      const FALLBACK_API = process.env.NEXT_PUBLIC_FALLBACK_API || 'https://rentify-server-ge0f.onrender.com'
      const originBase = API_BASE || FALLBACK_API
      if (!originBase) throw new Error('API base URL not available')

      const ep = `${originBase.replace(/\/$/, '')}/api/properties/user/${user._id}`
      const res = await fetch(ep, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })

      if (res && res.status === 401) {
        try {
          useAuthStore.setState({ user: null, token: null, profilePicture: null })
        } catch (e) { /* ignore */ }
        throw new Error('Session expired. Please sign in again.')
      }

      if (!res || !res.ok) {
        let msg = 'Failed to fetch listings'
        try { const txt = await res.text(); msg = txt || msg } catch (e) {}
        throw new Error(msg)
      }

      const data = await res.json()
      const results: PropertyItem[] = Array.isArray(data) ? data : (data.properties || data.results || [])

      const filtered = results.filter((prop: any) => {
        const ownerIdCandidates = new Set<string>()

        if (prop.postedBy) {
          if (typeof prop.postedBy === 'string') ownerIdCandidates.add(prop.postedBy)
          else if (prop.postedBy._id) ownerIdCandidates.add(prop.postedBy._id)
          else if (prop.postedBy.id) ownerIdCandidates.add(prop.postedBy.id)
        }

        if (prop.createdBy) {
          if (typeof prop.createdBy === 'string') ownerIdCandidates.add(prop.createdBy)
          else if (prop.createdBy._id) ownerIdCandidates.add(prop.createdBy._id)
          else if (prop.createdBy.id) ownerIdCandidates.add(prop.createdBy.id)
        }

        if (prop.owner) {
          if (typeof prop.owner === 'string') ownerIdCandidates.add(prop.owner)
          else if (prop.owner._id) ownerIdCandidates.add(prop.owner._id)
          else if (prop.owner.id) ownerIdCandidates.add(prop.owner.id)
        }

        if (prop.ownerId) ownerIdCandidates.add(prop.ownerId)
        if (prop.userId) ownerIdCandidates.add(prop.userId)
        if (prop.poster) ownerIdCandidates.add(prop.poster)

        if (ownerIdCandidates.size === 0) {
          try {
            const userEmail = (user && (user.email || (user as any)?.userEmail)) || null
            if (userEmail && (
              (prop.postedBy && typeof prop.postedBy !== 'string' && prop.postedBy.email === userEmail) ||
              (prop.createdBy && typeof prop.createdBy !== 'string' && prop.createdBy.email === userEmail) ||
              (prop.ownerEmail && prop.ownerEmail === userEmail) ||
              (prop.email && prop.email === userEmail)
            )) return true
          } catch (e) { /* ignore */ }

          try {
            const userNames = new Set<string>()
            if ((user as any)?.name) userNames.add(((user as any).name as string).toLowerCase())
            if ((user as any)?.fullName) userNames.add(((user as any).fullName as string).toLowerCase())
            if ((user as any)?.username) userNames.add(((user as any).username as string).toLowerCase())

            const ownerName = (prop.ownerName || prop.owner?.name || prop.postedBy?.name || prop.createdBy?.name || '') as string
            if (ownerName && userNames.size > 0 && userNames.has(ownerName.toLowerCase())) {
              return true
            }
          } catch (e) { /* ignore */ }
          return false
        }

        const userIds = new Set<string>()
        if (user?._id) userIds.add(user._id)
        if ((user as any)?.id) userIds.add((user as any).id)

        for (const uid of userIds) {
          if (ownerIdCandidates.has(uid)) return true
        }

        return false
      })

      setProperties(filtered)
    } catch (err: any) {
      setError(err?.message || 'Failed to load listings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMyListings()
  }, [user?._id, token, API_BASE])

  useEffect(() => {
    if (!user) {
      router.push('/')
    }
  }, [user, router])

  const handleDelete = async (id: string) => {
    const ok = confirm('Are you sure? This action cannot be undone.')
    if (!ok) return
    
    setDeletingId(id)
    try {
      const FALLBACK_API = process.env.NEXT_PUBLIC_FALLBACK_API || 'https://rentify-server-ge0f.onrender.com'
      const originBase = API_BASE || FALLBACK_API
      const ep = `${originBase.replace(/\/$/, '')}/api/properties/${id}`

      const res = await fetch(ep, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })

      if (!res || !res.ok) {
        let msg = `Failed to delete listing`
        try {
          const txt = await res.text()
          if (txt) msg = txt
        } catch (readErr) { /* ignore */ }
        throw new Error(msg)
      }

      await fetchMyListings()
    } catch (err: any) {
      alert(err?.message || 'Failed to delete listing')
    } finally {
      setDeletingId(null)
    }
  }

  const handleEditClick = (propertyId: string) => {
    // Open inline edit modal instead of navigating away
    setEditingPropertyId(propertyId)
    setIsEditOpen(true)
  }

  const handleViewClick = (propertyId: string) => {
    router.push(`/listings/${propertyId}`)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50">
        <Card className="w-full max-w-md border-violet-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5" /> My Listings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Please sign in to view and manage your listings.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <main className="h-screen overflow-auto bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 py-8 md:py-12">
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        {/* Header Section */}
        <div className="mb-10 md:mb-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push('/')}
                    className="p-2 rounded-md bg-white/10 text-dark hover:bg-white/20 mr-2"
                    aria-label="Go home"
                  >
                    ← Back
                  </button>
                  
                  <div className="p-3 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg">
                    <Home className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h1 className="text-2xl md:text-5xl font-black text-slate-900 tracking-tight">My Listings</h1>
              </div>
              <p className="text-base text-slate-600 max-w-2xl">Manage your rental properties with ease. Edit details, upload images, and track your listings all in one place.</p>
            </div>

            <Button 
              onClick={() => setIsAddOpen(true)} 
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-lg hover:shadow-xl px-6 py-6 rounded-xl font-semibold text-base transition-all duration-200 w-full md:w-auto"
            >
              <Plus className="w-5 h-5" /> Add New Property
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="animate-spin h-10 w-10 text-violet-600 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Loading your listings...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && properties.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-violet-100">
            <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12">
              <div className="flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 mb-4">
                  <div className="h-1 w-8 bg-gradient-to-r from-violet-600 to-purple-600 rounded"></div>
                  <span className="text-sm font-semibold text-violet-600">GET STARTED</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Create Your First Listing</h2>
                <p className="text-base text-slate-600 mb-8 leading-relaxed">Start showcasing your rental property today. Upload stunning photos, set competitive pricing, and reach potential tenants instantly.</p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={() => setIsAddOpen(true)} 
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 px-6 py-3 rounded-lg font-semibold transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" /> Add Property
                  </Button>
                  <Link href="/" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full border-2 border-violet-200 text-violet-600 hover:bg-violet-50 py-3 rounded-lg font-semibold">
                      Browse Listings
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="hidden md:flex items-center justify-center">
                <div className="bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl p-12 flex items-center justify-center">
                  <Home className="w-32 h-32 text-violet-300" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Properties Grid */}
        {!loading && properties.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {properties.map((property) => (
              <div 
                key={property._id} 
                className="group bg-white rounded-2xl shadow-md hover:shadow-2xl overflow-hidden border border-violet-100 transition-all duration-300 hover:-translate-y-1"
              >
                {/* Image Section */}
                <div className="relative h-56 md:h-64 overflow-hidden bg-slate-200">
                  <img 
                    src={property.images && property.images.length ? property.images[0] : '/placeholder.jpg'} 
                    alt={property.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  
                  {/* Price Badge */}
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                    <p className="text-base md:text-lg font-bold text-violet-600">₱{Number(property.price).toLocaleString()}</p>
                  </div>

                  {/* Action Buttons Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleEditClick(property._id)}
                        className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white hover:bg-violet-600 text-violet-600 hover:text-white shadow-lg transition-all duration-200 hover:scale-110"
                        aria-label="Edit property"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(property._id)}
                        disabled={deletingId === property._id}
                        className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50"
                        aria-label="Delete property"
                      >
                        {deletingId === property._id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-6">
                  <h3 className="text-lg md:text-xl font-bold text-slate-900 line-clamp-2 mb-2">{property.name}</h3>
                  
                  {property.location?.address && (
                    <div className="flex items-start gap-2 mb-6">
                      <MapPin className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-600 line-clamp-2">{property.location.address}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => handleEditClick(property._id)}
                      className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 font-semibold transition-all duration-200 text-sm"
                    >
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                    
                    <button 
                      onClick={() => handleDelete(property._id)}
                      disabled={deletingId === property._id}
                      className="flex items-center justify-center gap-2 flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all duration-200 text-sm disabled:opacity-50"
                      aria-label="Delete property"
                    >
                      {deletingId === property._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Section */}
        {!loading && properties.length > 0 && (
          <div className="mt-12 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-4xl font-bold">{properties.length}</p>
                <p className="text-violet-100 mt-2 font-medium">Total Listings</p>
              </div>
              <div>
                <p className="text-4xl font-bold">₱{properties.reduce((sum, p) => sum + p.price, 0).toLocaleString()}</p>
                <p className="text-violet-100 mt-2 font-medium">Combined Value</p>
              </div>
              <div>
                <p className="text-4xl font-bold">✓</p>
                <p className="text-violet-100 mt-2 font-medium">Active & Ready</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Property Modal (inline) */}
      {isEditOpen && editingPropertyId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setIsEditOpen(false); setEditingPropertyId(null); fetchMyListings() }} />
          <div className="relative w-full max-w-4xl mx-4">
            <div className="bg-white rounded-2xl shadow-xl p-4 max-h-[90vh] overflow-auto">
              <EditListingForm
                propertyId={editingPropertyId}
                onSaveSuccess={() => { setIsEditOpen(false); setEditingPropertyId(null); fetchMyListings() }}
                onClose={() => { setIsEditOpen(false); setEditingPropertyId(null); fetchMyListings() }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Property Modal */}
      <AddPropertyModal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onPropertyAdded={async () => { setIsAddOpen(false); await fetchMyListings() }} 
      />
    </main>
  )
}