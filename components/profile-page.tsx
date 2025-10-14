"use client"

import { useState, useRef } from "react"
import { User, Mail, MapPin, Phone, Calendar, Edit2, Camera, Save, X, Building, Heart, MessageSquare, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAuthStore } from "@/lib/auth-store"

export default function ProfilePage() {
  const { user, token, logout } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
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

    try {
      console.log('Step 1: Uploading image to Cloudinary...')
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size,
        sizeInMB: (file.size / 1024 / 1024).toFixed(2) + 'MB'
      })
      
      // Step 1: Upload image to Cloudinary
      const formDataToSend = new FormData()
      formDataToSend.append('propertyImage', file) // Field name must be 'propertyImage'

      console.log('Sending request to: https://rentify-server-ge0f.onrender.com/upload')

      const uploadResponse = await fetch('https://rentify-server-ge0f.onrender.com/upload', {
        method: 'POST',
        body: formDataToSend
      })

      console.log('Upload response status:', uploadResponse.status)
      console.log('Upload response ok:', uploadResponse.ok)

      // Check if response is JSON
      const contentType = uploadResponse.headers.get('content-type')
      console.log('Response content-type:', contentType)

      let uploadData
      try {
        uploadData = await uploadResponse.json()
        console.log('Upload response data:', uploadData)
      } catch (parseError) {
        const text = await uploadResponse.text()
        console.error('Failed to parse JSON response:', text.substring(0, 500))
        throw new Error('Server returned invalid response. Check console for details.')
      }

      if (!uploadResponse.ok) {
        throw new Error(uploadData.message || uploadData.error || `Upload failed with status ${uploadResponse.status}`)
      }

      // Check for success field and fileUrl
      if (!uploadData.success || !uploadData.fileUrl) {
        console.error('Response missing success or fileUrl:', uploadData)
        throw new Error('Failed to upload image to Cloudinary - invalid response format')
      }

      const imageUrl = uploadData.fileUrl
      console.log('✅ Upload successful! Image URL:', imageUrl)
      console.log('Step 2: Updating user profile picture with URL...')

      // Step 2: Update user profile picture in database
      const updateResponse = await fetch(`https://rentify-server-ge0f.onrender.com/api/auth/users/${user._id}/profile-picture`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl })
      })

      const updateData = await updateResponse.json()
      console.log('Update response:', updateData)

      if (!updateResponse.ok || !updateData.success) {
        throw new Error(updateData.message || 'Failed to update profile picture')
      }

      // Update local state and auth store with new profile picture
      setProfilePicture(updateData.user.profilePicture)
      
      useAuthStore.setState({ 
        user: updateData.user
      })

      alert('Profile picture updated successfully!')
    } catch (error) {
      console.error('Error uploading profile picture:', error)
      
      // Show detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload profile picture'
      alert(`Upload failed: ${errorMessage}\n\nCheck browser console for details.`)
      
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

      console.log('Updating profile for user:', user._id)
      console.log('Form data:', formData)
      
      // Call backend API
      const response = await fetch(`https://rentify-server-ge0f.onrender.com/api/auth/users/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      console.log('Response:', data)

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update profile')
      }

      // Update user in auth store with backend response
      useAuthStore.setState({ 
        user: data.user
      })

      setIsEditing(false)
      alert('Profile updated successfully!')
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

  // Mock data for stats - in real app, fetch from API
  const stats = {
    activeListings: 3,
    totalViews: 1247,
    inquiries: 28,
    favorites: 15
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-8">
      {/* Profile Header Card */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="h-32 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600"></div>
        <CardContent className="relative pt-0 pb-8 px-6">
          {/* Profile Picture */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-16 mb-6">
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              <div className="relative group">
                <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl bg-gradient-to-br from-purple-100 to-indigo-100 overflow-hidden">
                  {profilePicture ? (
                    <img 
                      src={profilePicture} 
                      alt={user?.name || user?.username || 'Profile'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-16 h-16 text-purple-600" />
                    </div>
                  )}
                </div>
                {isEditing && (
                  <button
                    onClick={handleProfilePictureClick}
                    disabled={uploadingImage}
                    className="absolute bottom-2 right-2 w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <Camera className="w-5 h-5" />
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
              </div>
              
              <div className="pb-2">
                <h1 className="text-3xl font-bold text-slate-900 mb-1">
                  {user?.fullName || user?.name || user?.username || "User"}
                </h1>
                <p className="text-slate-600 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4 md:mt-0">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    disabled={isSaving}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Profile Info */}
          {isEditing ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your.email@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+63 XXX XXX XXXX"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="City, Country"
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 text-sm">
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
                  <p className="font-medium text-slate-900">January 2024</p>
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
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Active Listings</p>
                <p className="text-3xl font-bold text-slate-900">{stats.activeListings}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                <Building className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Views</p>
                <p className="text-3xl font-bold text-slate-900">{stats.totalViews.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Inquiries</p>
                <p className="text-3xl font-bold text-slate-900">{stats.inquiries}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Favorites</p>
                <p className="text-3xl font-bold text-slate-900">{stats.favorites}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Settings */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Account Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
            >
              <User className="w-4 h-4 mr-2" />
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
    </div>
  )
}
