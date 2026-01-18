import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authenticateWithFacebook, verifyFacebookToken } from './facebook-auth'
import { API_API } from './config'

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
        // Client-side password complexity check (same as server)
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/
        const SUGGESTED_MSG = 'Password does not meet complexity requirements. It must be at least 8 characters long and include at least one uppercase letter, one number, and one symbol.'

        if (!passwordRegex.test(password)) {
          return { success: false, error: SUGGESTED_MSG }
        }

        set({ isLoading: true })

        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

          const response = await fetch(`${API_API}/api/auth/signup`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: 'include',
            body: JSON.stringify({ username, email, password }),
            signal: controller.signal
          })

          clearTimeout(timeoutId)

          // Try to parse JSON if server sent it; otherwise read text (HTML/error page)
          let data: any = null
          const contentType = response.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            data = await response.json()
          } else {
            // Non-JSON response (could be HTML error page or redirect). Read text to surface a helpful message.
            const text = await response.text()
            // If the response looks like HTML, return a generic error to avoid exposing HTML in the UI
            if (text && text.trim().startsWith('<')) {
              throw new Error('Server returned an unexpected HTML response. Check the backend or inspect network response for details.')
            }
            // Otherwise use the text as the message
            data = { message: text }
          }
          if (!response.ok) {
            // Keep server messages neutral for password complexity issues
            const msg = (response.status === 400 && data?.message && /password/i.test(data.message)) ? SUGGESTED_MSG : (data.message || "Something went wrong")
            throw new Error(msg)
          }

          set({
            token: data.token,
            user: data.user,
            profilePicture: data.user.profilePicture,
            isLoading: false
          })

          try {
            // Set a client-side cookie so Next.js middleware can detect authentication for protected routes.
            // Note: For production, prefer HttpOnly secure cookies set by the server.
            document.cookie = `token=${data.token}; path=/`;
          } catch (e) {
            // ignore (server-side rendering or restricted environments)
          }

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

          const response = await fetch(`${API_API}/api/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
            signal: controller.signal
          })

          clearTimeout(timeoutId)

          // Safely parse JSON or fallback to text when server returns HTML/error pages
          let data: any = null
          const contentType = response.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            data = await response.json()
          } else {
            const text = await response.text()
            if (text && text.trim().startsWith('<')) {
              throw new Error('Server returned an unexpected HTML response. Check the backend or inspect network response for details.')
            }
            data = { message: text }
          }
          if (!response.ok) throw new Error(data.message || "Something went wrong")

          set({
            token: data.token,
            user: data.user,
            profilePicture: data.user.profilePicture,
            isLoading: false,
          })

          try {
            // Set a client-side cookie so Next.js middleware can detect authentication for protected routes.
            // Note: For production, prefer HttpOnly secure cookies set by the server.
            document.cookie = `token=${data.token}; path=/`;
          } catch (e) {
            // ignore (server-side rendering or restricted environments)
          }

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
        // This function is no longer used - Facebook auth now redirects through backend
        // Keeping for backward compatibility, but users should click the button that redirects
        return { 
          success: false, 
          error: 'Please use the Facebook login button which redirects to the backend OAuth flow' 
        }
      },

      checkAuth: () => {
        const state = get()
        return !!state.token
      },

      logout: () => {
        set({ user: null, token: null, profilePicture: null, isLoading: false })
        try {
          // Attempt to clear server-side refresh token as well
          fetch(`${API_API}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {})
        } catch (e) { /* ignore */ }
        try {
          // Clear the token cookie on logout
          document.cookie = 'token=; Max-Age=0; path=/'
        } catch (e) {
          // ignore
        }
      },
    }),
    {
      name: 'auth-storage',
      // do not persist transient loading state to avoid 'stuck' loading
      partialize: (state) => ({ user: state.user, token: state.token, profilePicture: state.profilePicture }),
    }
  )
)
