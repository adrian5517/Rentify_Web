// Profile API Service
// Handles all profile-related API calls

import { getAuthToken } from './api'
import config from './config'

const API_BASE_URL = config.API_API

export interface ProfileUpdateData {
  name?: string
  email?: string
  phone?: string
  location?: string
  bio?: string
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  user?: T
  count?: number
}

export const profileService = {
  /**
   * Update user profile information
   * @param userId - MongoDB ObjectId of the user
   * @param profileData - Profile fields to update
   * @returns Updated user object
   */
  async updateProfile(userId: string, profileData: ProfileUpdateData) {
    try {
      const token = getAuthToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${API_BASE_URL}/api/auth/users/${userId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(profileData)
      })

      const contentType = response.headers.get('content-type') || ''
      let data: any = null
      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        if (text && text.trim().startsWith('<')) {
          throw new Error('Server returned unexpected HTML. Check API_BASE and server logs.')
        }
        data = { message: text }
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update profile')
      }

      return data
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  },

  /**
   * Upload image to Cloudinary
   * @param file - Image file to upload
   * @returns Cloudinary URL of uploaded image
   */
  async uploadImageToCloudinary(file: File): Promise<string> {
    try {
      const formData = new FormData()
      formData.append('propertyImage', file) // Field name MUST be 'propertyImage'

      // Uploading to Cloudinary (file details suppressed)

      // DO NOT set Content-Type header - browser will handle it automatically
      const token = getAuthToken()
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers,
        body: formData
      })

      const contentType = response.headers.get('content-type') || ''
      let data: any = null
      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        if (text && text.trim().startsWith('<')) {
          throw new Error('Server returned unexpected HTML during upload. Check upload endpoint and server logs.')
        }
        // Try to parse text as JSON fallback
        try { data = JSON.parse(text) } catch { data = { message: text } }
      }

      if (!response.ok) {
        console.error('Upload failed:', data)
        throw new Error(data.message || 'Upload failed')
      }

      // Validate response and extract file URL from common shapes
      if (!data.success) {
        throw new Error(data.message || 'Upload failed')
      }

      const fileUrl = data.fileUrl || (data.files && data.files[0] && (data.files[0].secure_url || data.files[0].url || data.files[0].fileUrl))
      if (!fileUrl) {
        throw new Error('Invalid upload response - missing file URL')
      }

      return fileUrl
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error)
      throw error
    }
  },

  /**
   * Update user profile picture
   * @param userId - MongoDB ObjectId of the user
   * @param imageUrl - Cloudinary URL of the image
   * @returns Updated user object
   */
  async updateProfilePicture(userId: string, imageUrl: string) {
    try {
      const token = getAuthToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${API_BASE_URL}/api/auth/users/${userId}/profile-picture`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ imageUrl })
      })

      const contentType = response.headers.get('content-type') || ''
      let data: any = null
      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        if (text && text.trim().startsWith('<')) {
          throw new Error('Server returned unexpected HTML. Check API_BASE and server logs.')
        }
        data = { message: text }
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update profile picture')
      }

      return data
    } catch (error) {
      console.error('Error updating profile picture:', error)
      throw error
    }
  },

  /**
   * Get user by ID
   * @param userId - MongoDB ObjectId of the user
   * @returns User object
   */
  async getUserById(userId: string) {
    try {
      const token = getAuthToken()
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${API_BASE_URL}/api/auth/users/${userId}`, { headers })
      const contentType = response.headers.get('content-type') || ''
      let data: any = null
      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        if (text && text.trim().startsWith('<')) {
          throw new Error('Server returned unexpected HTML. Check API_BASE and server logs.')
        }
        data = { message: text }
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch user')
      }

      return data.user
    } catch (error) {
      console.error('Error fetching user:', error)
      throw error
    }
  },

  /**
   * Get all users
   * @returns Array of users and total count
   */
  async getAllUsers() {
    try {
      const token = getAuthToken()
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${API_BASE_URL}/api/auth/users`, { headers })
      const contentType = response.headers.get('content-type') || ''
      let data: any = null
      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        if (text && text.trim().startsWith('<')) {
          throw new Error('Server returned unexpected HTML. Check API_BASE and server logs.')
        }
        data = { message: text }
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch users')
      }

      return {
        users: data.users,
        count: data.count
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      throw error
    }
  }
}
