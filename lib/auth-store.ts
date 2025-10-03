import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  _id: string
  username: string
  email: string
  name?: string
  profilePicture?: string
}

interface AuthState {
  user: User | null
  token: string | null
  profilePicture: string | null
  isLoading: boolean
  setUser: (user: User | null) => void
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
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
          const response = await fetch("https://rentify-server-ge0f.onrender.com/api/auth/signup", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, email, password }),
          })

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
          return { success: false, error: error instanceof Error ? error.message : "Registration failed" }
        }
      },

      login: async (email, password) => {
        set({ isLoading: true })

        try {
          const response = await fetch("https://rentify-server-ge0f.onrender.com/api/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
          })

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
          return { success: false, error: error instanceof Error ? error.message : "Login failed" }
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
