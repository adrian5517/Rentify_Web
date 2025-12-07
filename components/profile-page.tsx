"use client"

import { useState, useRef, useEffect } from "react"
import { User, Mail, MapPin, Phone, Calendar, Edit2, Camera, Save, X, Building, Heart, MessageSquare, TrendingUp, CheckCircle2, Home, Edit, Trash2, Eye } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useAuthStore } from "@/lib/auth-store"
import config from '@/lib/config'
import ProfilePictureUploader from '@/components/profile-picture-uploader'

// Property interface
interface Property {
  _id: string
  name: string
  description: string
  images: string[]
  price: number
  propertyType: string
  amenities: string[]
  status: string
  location: {
    address: string
    latitude: number
    longitude: number
  }
  createdAt: string
}

export default function ProfilePage() {
  // Use NEXT_PUBLIC_API_BASE to avoid hard-coding backend host in client code
  // Set this in Vercel or your environment to e.g. https://rentify-server-ge0f.onrender.com
  const API_BASE: string = config.API_API
  const { user, token, logout } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadErrorRaw, setUploadErrorRaw] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showEditComingSoonModal, setShowEditComingSoonModal] = useState(false)
  const [myProperties, setMyProperties] = useState<Property[]>([])
  const [loadingProperties, setLoadingProperties] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Form state - mapping backend fields to frontend
  const [formData, setFormData] = useState({
    name: user?.fullName || user?.name || user?.username || "",
    email: user?.email || "",
    phone: user?.phoneNumber || user?.phone || "",
    location: user?.address || user?.location || "",
    bio: user?.bio || ""
  })

  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || "")

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleProfilePictureClick = () => {
    if (isEditing) {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB')
      return
    }

    // Check authentication
    if (!user?._id) {
      alert('You must be logged in to update your profile picture')
      return
    }

    setUploadingImage(true)

    // Track the last server response (parsed or text) so we can show it in debug UI
    let lastUploadInfo: any = null

    try {
      // Uploading image to Cloudinary (file details suppressed)
      
      // Step 1: Upload image to Cloudinary
      // Try a few common endpoints and field names — server may expose `/api/upload` or `/upload` and expect a different form field key.
      const endpoints = [
        '/api/upload',
        '/upload',
        'https://rentify-server-ge0f.onrender.com/api/upload',
        'https://rentify-server-ge0f.onrender.com/upload'
      ]
      const fieldNames = ['propertyImage', 'file', 'image', 'profileImage']
      let uploadData: any = null
      let imageUrl: string | null = null

      // Iterate endpoints first (prefer `/api/upload`), then try different form field names
      for (const endpoint of endpoints) {
        for (const fieldName of fieldNames) {
          try {
            const fd = new FormData()
            fd.append(fieldName, file)
            // If endpoint is relative and API_BASE is set, prefer the absolute API_BASE-prefixed URL
            const resolvedEndpoint = endpoint.startsWith('/') && API_BASE ? `${API_BASE}${endpoint}` : endpoint
            const uploadHeaders: Record<string, string> = {}
            if (token) uploadHeaders['Authorization'] = `Bearer ${token}`
            const res = await fetch(resolvedEndpoint, {
              method: 'POST',
              headers: uploadHeaders,
              body: fd
            })

            // Read body as text first (safe single read), then try to parse JSON.
            const textBody = await res.text()
            let parsed: any = null
            try {
              parsed = JSON.parse(textBody)
            } catch (parseErr) {
              console.warn(`Upload response (non-JSON) for endpoint '${endpoint}' field '${fieldName}':`, textBody.substring(0, 300))
              parsed = { success: false, message: textBody }
            }

            // Save last response (status, headers, body) for debugging UI
            try {
              lastUploadInfo = {
                endpoint: resolvedEndpoint,
                fieldName,
                status: res.status,
                headers: Object.fromEntries(res.headers.entries ? res.headers.entries() : []),
                body: parsed,
              }
            } catch (e) {
              lastUploadInfo = { endpoint: resolvedEndpoint, fieldName, status: res.status, body: parsed }
            }

            if (res.ok && parsed && parsed.success && (parsed.fileUrl || parsed.url)) {
              uploadData = parsed
              imageUrl = parsed.fileUrl || parsed.url
              break
            }

            // Not successful — log and try next field name
            console.warn(`Upload to '${endpoint}' with field '${fieldName}' failed:`, parsed || res.status)
          } catch (err) {
            console.warn(`Upload attempt to '${endpoint}' for field '${fieldName}' threw:`, err)
            lastUploadInfo = String(err)
          }
        }

        if (imageUrl) break
      }

      if (!imageUrl) {
        console.error('All upload attempts failed. Last response:', lastUploadInfo)
        // Save last server response so the debug UI can display it
        try { setUploadErrorRaw(typeof lastUploadInfo === 'string' ? lastUploadInfo : JSON.stringify(lastUploadInfo, null, 2)) } catch(e) { setUploadErrorRaw(String(lastUploadInfo)) }
        throw new Error('Upload failed: server did not accept the file. Check server logs or try again.')
      }

      // Step 2: Update user profile picture in database
      const profileUpdateUrl = API_BASE ? `${API_BASE}/api/auth/users/${user._id}/profile-picture` : `/api/auth/users/${user._id}/profile-picture`
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const updateResponse = await fetch(profileUpdateUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ imageUrl })
      })

      // Parse JSON safely, fall back to text for HTML/error pages
      const contentType = updateResponse.headers.get('content-type') || ''
      let updateData: any = null
      if (contentType.includes('application/json')) {
        updateData = await updateResponse.json()
      } else {
        const text = await updateResponse.text()
        if (text && text.trim().startsWith('<')) {
          throw new Error('Server returned an unexpected HTML response. Check API_BASE and server logs for details.')
        }
        updateData = { message: text }
      }

      if (!updateResponse.ok || !updateData.success) {
        throw new Error(updateData.message || 'Failed to update profile picture')
      }

      // Update local state and auth store with new profile picture
      setProfilePicture(updateData.user.profilePicture)
      
      useAuthStore.setState({ 
        user: updateData.user
      })

      setSuccessMessage('Profile picture updated successfully!')
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Error uploading profile picture:', error)
      
      // Show detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload profile picture'
      // Ensure debug UI has something useful if not already set
      try {
        if (!uploadErrorRaw) setUploadErrorRaw(error instanceof Error ? error.message : String(error))
      } catch (e) { /* ignore */ }
      alert(`Upload failed: ${errorMessage}\n\nCheck browser console for details. You can also view the server response below.`)
      
      // Optional: Offer fallback to base64 storage
      if (confirm('Would you like to try saving the image locally instead? (Note: Image will not be uploaded to cloud)')) {
        try {
          const reader = new FileReader()
          reader.onloadend = () => {
            const base64String = reader.result as string
            setProfilePicture(base64String)
            useAuthStore.setState({ 
              user: { ...user!, profilePicture: base64String }
            })
            alert('Profile picture saved locally (not uploaded to cloud)')
            setUploadingImage(false)
          }
          reader.onerror = () => {
            alert('Failed to read image file')
            setUploadingImage(false)
          }
          // Use the file variable that's already in scope
          reader.readAsDataURL(file)
          return
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError)
        }
      }
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    
    try {
      // Validate that we have user
      if (!user?._id) {
        throw new Error('You must be logged in to update your profile')
      }

      // Updating profile for user (suppressed)
      
      // Call backend API
      const profileUrl = API_BASE ? `${API_BASE}/api/auth/users/${user._id}` : `/api/auth/users/${user._id}`
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(profileUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(formData)
      })

      const contentType = response.headers.get('content-type') || ''
      let data: any = null
      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        if (text && text.trim().startsWith('<')) {
          throw new Error('Server returned an unexpected HTML response. Check API_BASE and server logs for details.')
        }
        data = { message: text }
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update profile')
      }

      // Update user in auth store with backend response
      useAuthStore.setState({ 
        user: data.user
      })

      setIsEditing(false)
      setSuccessMessage('Profile updated successfully!')
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Error updating profile:', error)
      alert(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    // Reset form data with backend field mapping
    setFormData({
      name: user?.fullName || user?.name || user?.username || "",
      email: user?.email || "",
      phone: user?.phoneNumber || user?.phone || "",
      location: user?.address || user?.location || "",
      bio: user?.bio || ""
    })
    setIsEditing(false)
  }

  // Mock data for stats - fetch from API
  const stats = {
    activeListings: myProperties.filter(p => p.status === 'available' || p.status === 'For rent').length,
    totalViews: 1247,
    inquiries: 28,
    favorites: 15
  }

  // Fetch user's properties
  useEffect(() => {
    const fetchMyProperties = async () => {
      if (!user?._id) {
        setLoadingProperties(false)
        return
      }

      try {
        setLoadingProperties(true)
        const propsUrl = `${API_BASE.replace(/\/$/, '')}/api/properties/user/${user._id}`
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const response = await fetch(propsUrl, { headers })
        
        if (!response.ok) {
          throw new Error('Failed to fetch properties')
        }

        const data = await response.json()
        // User properties fetched (suppressed)

        // Handle different response formats
        let properties: Property[] = []
        if (Array.isArray(data)) {
          properties = data
        } else if (data.properties && Array.isArray(data.properties)) {
          properties = data.properties
        } else if (data.success && data.properties && Array.isArray(data.properties)) {
          properties = data.properties
        }

        setMyProperties(properties)
      } catch (error) {
        console.error('Error fetching user properties:', error)
      } finally {
        setLoadingProperties(false)
      }
    }

    fetchMyProperties()
  }, [user?._id])

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return
    }

    try {
      const deleteUrl = `${API_BASE.replace(/\/$/, '')}/api/properties/${propertyId}`
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete property')
      }

      // Remove from local state
      setMyProperties(myProperties.filter(p => p._id !== propertyId))
      setSuccessMessage('Property deleted successfully!')
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Error deleting property:', error)
      alert('Failed to delete property')
    }
  }

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return 'https://via.placeholder.com/400x300?text=No+Image'
    if (imagePath.startsWith('http')) return imagePath
    const prefix = API_BASE || ''
    return `${prefix}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5 md:space-y-6 py-4 sm:py-6 md:py-8 px-3 sm:px-4">
      {/* Profile Header Card */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="h-24 sm:h-28 md:h-32 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600"></div>
        <CardContent className="relative pt-0 pb-6 sm:pb-7 md:pb-8 px-4 sm:px-5 md:px-6">
          {/* Profile Picture */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-12 sm:-mt-14 md:-mt-16 mb-4 sm:mb-5 md:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5 md:gap-6">
              <div className="relative group">
                <div className="w-24 sm:w-28 md:w-32 h-24 sm:h-28 md:h-32 rounded-xl sm:rounded-2xl border-4 border-white shadow-xl bg-gradient-to-br from-purple-100 to-indigo-100 overflow-hidden">
                  {profilePicture ? (
                    <img 
                      src={profilePicture} 
                      alt={user?.name || user?.username || 'Profile'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 text-purple-600" />
                    </div>
                  )}
                </div>
                {isEditing && (
                  <button
                    onClick={handleProfilePictureClick}
                    disabled={uploadingImage}
                    className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 w-8 sm:w-9 md:w-10 h-8 sm:h-9 md:h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <div className="animate-spin rounded-full h-4 sm:h-5 w-4 sm:w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <Camera className="w-4 sm:w-5 h-4 sm:h-5" />
                    )}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {uploadErrorRaw && (
                  <div className="mt-2">
                    <details className="bg-red-50 border border-red-100 rounded p-2 text-xs text-red-800">
                      <summary className="font-semibold cursor-pointer">Upload error — view server response</summary>
                      <pre className="whitespace-pre-wrap max-h-40 overflow-auto mt-2 text-[11px] leading-snug">{uploadErrorRaw}</pre>
                    </details>
                  </div>
                )}
              </div>
              
              <div className="pb-0 sm:pb-1 md:pb-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-1">
                  {user?.fullName || user?.name || user?.username || "User"}
                </h1>
                <p className="text-sm sm:text-base text-slate-600 flex items-center gap-2">
                  <Mail className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  {user?.email}
                </p>
                {isEditing && (
                  <div className="mt-3">
                    <ProfilePictureUploader onDone={(updatedUser: any) => {
                      try {
                        if (updatedUser && updatedUser.profilePicture) setProfilePicture(updatedUser.profilePicture)
                        // update auth store as well
                        useAuthStore.setState({ user: updatedUser })
                      } catch (e) { /* ignore */ }
                    }} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md h-9 sm:h-10 text-sm sm:text-base"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md h-9 sm:h-10 text-sm sm:text-base"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 sm:h-4 w-3.5 sm:w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    disabled={isSaving}
                    className="h-9 sm:h-10 text-sm sm:text-base"
                  >
                    <X className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Profile Info */}
          {isEditing ? (
            <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs sm:text-sm">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="h-9 sm:h-10 text-sm sm:text-base"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs sm:text-sm">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your.email@example.com"
                  className="h-9 sm:h-10 text-sm sm:text-base"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs sm:text-sm">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+63 XXX XXX XXXX"
                  className="h-9 sm:h-10 text-sm sm:text-base"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location" className="text-xs sm:text-sm">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="City, Country"
                  className="h-9 sm:h-10 text-sm sm:text-base"
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio" className="text-xs sm:text-sm">Bio</Label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none text-sm sm:text-base"
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 text-xs sm:text-sm">
              {formData.phone && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Phone className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-slate-500 text-xs">Phone</p>
                    <p className="font-medium text-slate-900">{formData.phone}</p>
                  </div>
                </div>
              )}
              
              {formData.location && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-slate-500 text-xs">Location</p>
                    <p className="font-medium text-slate-900">{formData.location}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-slate-500 text-xs">Member Since</p>
                  <p className="font-medium text-slate-900">
                    {user?.createdAt 
                      ? new Date(user.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
              
              {formData.bio && (
                <div className="md:col-span-2 p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500 text-xs mb-1">Bio</p>
                  <p className="text-slate-900">{formData.bio}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-2 md:grid-cols-4">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">Active Listings</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">{stats.activeListings}</p>
              </div>
              <div className="w-10 sm:w-11 md:w-12 h-10 sm:h-11 md:h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Building className="w-5 sm:w-5.5 md:w-6 h-5 sm:h-5.5 md:h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">Total Views</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">{stats.totalViews.toLocaleString()}</p>
              </div>
              <div className="w-10 sm:w-11 md:w-12 h-10 sm:h-11 md:h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg sm:rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 sm:w-5.5 md:w-6 h-5 sm:h-5.5 md:h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">Inquiries</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">{stats.inquiries}</p>
              </div>
              <div className="w-10 sm:w-11 md:w-12 h-10 sm:h-11 md:h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-lg sm:rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 sm:w-5.5 md:w-6 h-5 sm:h-5.5 md:h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">Favorites</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">{stats.favorites}</p>
              </div>
              <div className="w-10 sm:w-11 md:w-12 h-10 sm:h-11 md:h-12 bg-gradient-to-br from-pink-100 to-pink-200 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Heart className="w-5 sm:w-5.5 md:w-6 h-5 sm:h-5.5 md:h-6 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Properties Section */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50 p-4 sm:p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg sm:text-xl md:text-2xl flex items-center gap-2">
                <Home className="w-5 sm:w-5.5 md:w-6 h-5 sm:h-5.5 md:h-6 text-purple-600" />
                My Properties
              </CardTitle>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">Manage your listed properties</p>
            </div>
            <Badge className="bg-purple-600 text-white">
              {myProperties.length} {myProperties.length === 1 ? 'Property' : 'Properties'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loadingProperties ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mb-4"></div>
              <p className="text-slate-600">Loading your properties...</p>
            </div>
          ) : myProperties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Building className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Properties Yet</h3>
              <p className="text-slate-600 mb-6 text-center max-w-md">
                You haven't listed any properties yet. Start adding your first property to reach potential renters!
              </p>
              <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white">
                <Building className="w-4 h-4 mr-2" />
                Add Your First Property
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {myProperties.map((property) => (
                <Card key={property._id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md group">
                  {/* Property Image */}
                  <div className="relative h-40 sm:h-44 md:h-48 overflow-hidden">
                    <img
                      src={getImageUrl(property.images[0])}
                      alt={property.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image'
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    {/* Status Badge */}
                    <Badge 
                      className={`absolute top-2 sm:top-3 right-2 sm:right-3 capitalize text-xs px-2 py-0.5 ${
                        property.status === 'available' || property.status === 'For rent' 
                          ? 'bg-green-500 text-white' 
                          : property.status === 'For sale'
                          ? 'bg-blue-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {property.status}
                    </Badge>

                    {/* Image Count */}
                    {property.images.length > 1 && (
                      <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        {property.images.length}
                      </div>
                    )}
                  </div>

                  <CardContent className="p-3 sm:p-4">
                    {/* Property Info */}
                    <h3 className="font-bold text-base sm:text-lg text-slate-900 mb-2 line-clamp-1">
                      {property.name}
                    </h3>
                    
                    <p className="text-xl sm:text-2xl font-bold text-purple-600 mb-2">
                      ₱{property.price.toLocaleString()}
                      <span className="text-xs sm:text-sm text-slate-500 font-normal">/month</span>
                    </p>

                    <div className="flex items-start gap-2 mb-2 sm:mb-3">
                      <MapPin className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">{property.location.address}</p>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 mb-2 sm:mb-3">
                      {property.description}
                    </p>

                    {/* Amenities */}
                    {property.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
                        {property.amenities.slice(0, 3).map((amenity, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs px-1.5 py-0.5">
                            {amenity}
                          </Badge>
                        ))}
                        {property.amenities.length > 3 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                            +{property.amenities.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Property Type */}
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <Badge className="bg-indigo-100 text-indigo-700 capitalize text-xs px-1.5 py-0.5">
                        {property.propertyType}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        Listed {new Date(property.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white h-8 sm:h-9 text-xs sm:text-sm"
                        onClick={() => setShowEditComingSoonModal(true)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-300 hover:bg-slate-50 h-8 sm:h-9 text-xs sm:text-sm"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50 h-8 sm:h-9 px-2 sm:px-3"
                        onClick={() => handleDeleteProperty(property._id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Sections */}
      <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 md:grid-cols-2">
        {/* Account Settings */}
        <Card className="border-0 shadow-md">
          <CardHeader className="p-4 sm:p-5 md:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl">Account Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-5 md:p-6 pt-0">
            <Button 
              variant="outline" 
              className="w-full justify-start hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 h-9 sm:h-10 text-xs sm:text-sm"
            >
              <User className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-2" />
              Edit Profile Information
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Preferences
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
            >
              🔔
              <span className="ml-2">Notification Settings</span>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
            >
              🔒
              <span className="ml-2">Privacy & Security</span>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">New property listing viewed</p>
                <p className="text-xs text-slate-500">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Profile updated successfully</p>
                <p className="text-xs text-slate-500">1 day ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">New message received</p>
                <p className="text-xs text-slate-500">3 days ago</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <Card className="border-red-200 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <h4 className="font-semibold text-slate-900">Sign Out</h4>
              <p className="text-sm text-slate-600">Sign out from your account</p>
            </div>
            <Button
              variant="outline"
              onClick={logout}
              className="text-red-600 border-red-300 hover:bg-red-600 hover:text-white"
            >
              Sign Out
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
            <div>
              <h4 className="font-semibold text-slate-900">Delete Account</h4>
              <p className="text-sm text-slate-600">Permanently delete your account and all data</p>
            </div>
            <Button
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-600 hover:text-white"
            >
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Success!</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              {successMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8"
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Coming Soon Modal */}
      <Dialog open={showEditComingSoonModal} onOpenChange={setShowEditComingSoonModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center">
                <Edit className="w-10 h-10 text-purple-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Coming Soon!</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              Edit functionality is currently under development. You'll be able to update your property details soon!
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button
              onClick={() => setShowEditComingSoonModal(false)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8"
            >
              Okay, Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
