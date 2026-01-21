// Centralized runtime config for client code.
// Expose `API_API` used by stores and services. Prefer NEXT_PUBLIC variables.
const DEFAULT_BACKEND = 'https://rentify-server-ge0f.onrender.com'

const DEFAULT_CLIENT = 'https://rentify-web-beta.vercel.app'

export const API_API: string =
  (process.env.NEXT_PUBLIC_API_URL && String(process.env.NEXT_PUBLIC_API_URL).replace(/\/$/, '')) ||
  (process.env.NEXT_PUBLIC_API_BASE && String(process.env.NEXT_PUBLIC_API_BASE).replace(/\/$/, '')) ||
  DEFAULT_BACKEND

// Toggle to use fake payments on the client. Set NEXT_PUBLIC_USE_FAKE_PAYMENTS=true to enable.
export const USE_FAKE_PAYMENTS: boolean = String(process.env.NEXT_PUBLIC_USE_FAKE_PAYMENTS || '').toLowerCase() === 'true'

export default {
  API_API,
  USE_FAKE_PAYMENTS,
}

// Public client URL (frontend). Falls back to the known production URL.
export const CLIENT_URL: string =
  (process.env.NEXT_PUBLIC_CLIENT_URL && String(process.env.NEXT_PUBLIC_CLIENT_URL).replace(/\/$/, '')) ||
  DEFAULT_CLIENT
