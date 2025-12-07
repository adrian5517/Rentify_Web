// Centralized runtime config for client code.
// Expose `API_API` used by stores and services. Prefer NEXT_PUBLIC variables.
const DEFAULT_BACKEND = 'https://rentify-server-ge0f.onrender.com'

export const API_API: string =
  (process.env.NEXT_PUBLIC_API_URL && String(process.env.NEXT_PUBLIC_API_URL).replace(/\/$/, '')) ||
  (process.env.NEXT_PUBLIC_API_BASE && String(process.env.NEXT_PUBLIC_API_BASE).replace(/\/$/, '')) ||
  DEFAULT_BACKEND

export default {
  API_API,
}
