// Profile API Service
// Handles all profile-related API calls

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://rentify-server-ge0f.onrender.com'

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
      const response = await fetch(`${API_BASE_URL}/api/auth/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData)
      })

      const data = await response.json()
      
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

      console.log('Uploading to Cloudinary...', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })

      // DO NOT set Content-Type header - browser will handle it automatically
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Upload failed:', error)
        throw new Error(error.message || 'Upload failed')
      }

      const data = await response.json()
      
      // Validate response has success and fileUrl
      if (!data.success || !data.fileUrl) {
        throw new Error('Invalid upload response - missing success or fileUrl')
      }

      console.log('Upload successful:', data.fileUrl)
      return data.fileUrl
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
      const response = await fetch(`${API_BASE_URL}/api/auth/users/${userId}/profile-picture`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl })
      })

      const data = await response.json()
      
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
      const response = await fetch(`${API_BASE_URL}/api/auth/users/${userId}`)
      const data = await response.json()
      
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
      const response = await fetch(`${API_BASE_URL}/api/auth/users`)
      const data = await response.json()
      
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
