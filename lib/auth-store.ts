import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authenticateWithFacebook, verifyFacebookToken } from './facebook-auth'

interface User {
  _id: string
  username: string
  email: string
  name?: string
  fullName?: string  // Backend field name
  profilePicture?: string
  phoneNumber?: string  // Backend field name
  phone?: string  // Frontend alias
  address?: string  // Backend field name
  location?: string  // Frontend alias
  bio?: string
  role?: string
  createdAt?: string
  updatedAt?: string
  facebookId?: string  // For Facebook OAuth
}

interface AuthState {
  user: User | null
  token: string | null
  profilePicture: string | null
  isLoading: boolean
  setUser: (user: User | null) => void
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  loginWithFacebook: () => Promise<{ success: boolean; error?: string }>
  checkAuth: () => boolean
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      profilePicture: null,
      isLoading: false,

      setUser: (user) => set({ user }),

      register: async (username, email, password) => {
        set({ isLoading: true })

        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

          const response = await fetch("https://rentify-server-ge0f.onrender.com/api/auth/signup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, email, password }),
            signal: controller.signal
          })

          clearTimeout(timeoutId)

          const data = await response.json()
          if (!response.ok) throw new Error(data.message || "Something went wrong")

          set({
            token: data.token,
            user: data.user,
            profilePicture: data.user.profilePicture,
            isLoading: false
          })

          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          if (error instanceof Error && error.name === 'AbortError') {
            return { success: false, error: "Request timeout. Server is taking too long to respond." }
          }
          return { success: false, error: error instanceof Error ? error.message : "Registration failed" }
        }
      },

      login: async (email, password) => {
        set({ isLoading: true })

        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

          const response = await fetch("https://rentify-server-ge0f.onrender.com/api/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
            signal: controller.signal
          })

          clearTimeout(timeoutId)

          const data = await response.json()
          if (!response.ok) throw new Error(data.message || "Something went wrong")

          set({
            token: data.token,
            user: data.user,
            profilePicture: data.user.profilePicture,
            isLoading: false,
          })

          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          if (error instanceof Error && error.name === 'AbortError') {
            return { success: false, error: "Request timeout. Server is taking too long to respond." }
          }
          return { success: false, error: error instanceof Error ? error.message : "Login failed" }
        }
      },

      loginWithFacebook: async () => {
        set({ isLoading: true })

        try {
          // Authenticate with Facebook and get user data
          const { userData, accessToken } = await authenticateWithFacebook()

          // Verify token with backend and create/login user
          const result = await verifyFacebookToken(accessToken, userData)

          if (!result.success) {
            throw new Error(result.error || 'Facebook authentication failed')
          }

          const { token, user } = result.data

          set({
            token,
            user,
            profilePicture: user.profilePicture,
            isLoading: false,
          })

          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return { 
            success: false, 
            error: error instanceof Error ? error.message : "Facebook login failed" 
          }
        }
      },

      checkAuth: () => {
        const state = get()
        return !!state.token
      },

      logout: () => {
        set({ user: null, token: null, profilePicture: null })
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
