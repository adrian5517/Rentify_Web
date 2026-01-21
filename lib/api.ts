import { useAuthStore } from './auth-store'
import { API_API } from './config'

type FetchInput = RequestInfo
type FetchInit = RequestInit | undefined

async function safeParseJson(res: Response) {
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { message: text } }
}

/**
 * authFetch: like fetch but automatically attempts a refresh on 401 once.
 * - includes Authorization header if token exists
 * - on 401: calls POST /api/auth/refresh with credentials included, updates useAuthStore token, and retries once
 */
export async function authFetch(input: FetchInput, init?: FetchInit) {
  const base = (API_API || '').replace(/\/$/, '')
  const url = typeof input === 'string' ? input : (input as Request).url

  const state = useAuthStore.getState()
  let token = state.token
  // If Zustand store isn't hydrated yet on page load, fall back to persisted token in localStorage
  if (!token && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('auth-storage')
      if (raw) {
        const parsed = JSON.parse(raw)
        token = parsed?.state?.token || token
      }
    } catch (e) {
      // ignore
    }
  }

  const headers = new Headers(init && init.headers ? init.headers as HeadersInit : undefined)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const reqInit: RequestInit = { ...init, headers }

  let res = await fetch(typeof input === 'string' ? input : input as Request, reqInit)

  if (res.status !== 401) return res

  // Attempt refresh
  try {
    const refreshRes = await fetch(`${base}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
    if (!refreshRes.ok) {
      // refresh failed: clear auth and return original 401
      useAuthStore.setState({ user: null, token: null, profilePicture: null })
      return res
    }

    const data = await safeParseJson(refreshRes)
    if (data && data.token) {
      useAuthStore.setState({ token: data.token, user: data.user || useAuthStore.getState().user, profilePicture: (data.user && data.user.profilePicture) || useAuthStore.getState().profilePicture })
      // retry original request with new token
      const newHeaders = new Headers(headers)
      newHeaders.set('Authorization', `Bearer ${data.token}`)
      const retryInit: RequestInit = { ...reqInit, headers: newHeaders }
      return fetch(typeof input === 'string' ? input : input as Request, retryInit)
    }
  } catch (e) {
    // ignore and fall through
  }

  // If refresh didn't yield a token, clear auth state
  useAuthStore.setState({ user: null, token: null, profilePicture: null })
  return res
}

export default authFetch
const API_BASE_URL = 'https://rentify-server-ge0f.onrender.com/api';

// Helper function to handle 401 errors (expired token)
const handleUnauthorized = () => {
  console.warn('⚠️ Token expired or invalid. Please log in again.');
  // Clear auth storage
  localStorage.removeItem('auth-storage');
  // Redirect to login page
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
};

// Helper function to get auth token from localStorage
export const getAuthToken = (): string | null => {
  try {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.state?.token || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Helper function to get auth headers
const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

export interface MessageData {
  _id: string;
  sender: string;
  receiver: string;
  message?: string;
  imageUrls?: string[];
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserData {
  _id?: string; // MongoDB ID
  id?: string; // Facebook OAuth ID
  name?: string;
  fullName?: string;
  username?: string;
  email: string;
  profilePicture?: string;
  role?: string;
  phoneNumber?: string;
}

// Fetch messages between two users
export const fetchMessages = async (userId1: string, userId2: string): Promise<MessageData[]> => {
  try {
    // Fetching messages (details suppressed)
    const url = `${API_BASE_URL}/messages/${userId1}/${userId2}`;
    const token = getAuthToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { headers });
    // Response status available (suppressed)
    
    if (response.status === 401) {
      console.error('❌ Unauthorized: Token expired or invalid');
      handleUnauthorized();
      return [];
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      
      // If endpoint doesn't exist or returns 404, return empty array
      if (response.status === 404) {
        // No messages found, returning empty array
        return [];
      }
      
      throw new Error(`Failed to fetch messages: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    // Fetched messages (suppressed)
    return data;
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    
    // Return empty array instead of throwing error to prevent app crash
    // Returning empty messages array due to error
    return [];
  }
};

// Send message via REST API (fallback or for file uploads)
export const sendMessageAPI = async (
  senderId: string,
  receiverId: string,
  text?: string,
  images?: File[]
): Promise<MessageData> => {
  try {
    // Defensive validation: ensure receiverId is provided before attempting to send.
    if (!receiverId) {
      throw new Error('No receiverId provided - cannot send message')
    }
    const formData = new FormData();
    formData.append('senderId', senderId);
    formData.append('receiverId', receiverId);
    if (text) {
      formData.append('text', text);
    }
    if (images && images.length > 0) {
      images.forEach((image) => {
        formData.append('images', image);
      });
    }

    const token = getAuthToken();
    const headers: Record<string, string> = {};

    // Defensive: if there's no auth token, surface a clear error so callers
    // can prompt the user to log in instead of silently sending an anonymous request.
    if (!token) {
      throw new Error('No auth token - user not authenticated')
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/messages/send`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 401) {
      console.error('❌ Unauthorized: Token expired or invalid');
      handleUnauthorized();
      throw new Error('Unauthorized - please log in again');
    }

    if (!response.ok) {
      // attempt to surface server error message
      let msg = 'Failed to send message';
      try {
        const txt = await response.text();
        if (txt) msg = `Failed to send message: ${txt}`;
      } catch (e) {
        // ignore
      }
      throw new Error(msg);
    }

    const result = await response.json();

    // Dispatch a DOM event so other client components can react (optimistic UI)
    try {
      if (typeof window !== 'undefined' && window?.CustomEvent) {
        const ev = new CustomEvent('rentify:messageSent', { detail: { message: result } });
        window.dispatchEvent(ev as Event);
      }
    } catch (e) {
      // ignore dispatch errors
    }

    return result;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Delete message
export const deleteMessage = async (messageId: string): Promise<void> => {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
      method: 'DELETE',
      headers,
    });

    if (response.status === 401) {
      console.error('❌ Unauthorized: Token expired or invalid');
      handleUnauthorized();
      throw new Error('Unauthorized - please log in again');
    }

    if (!response.ok) {
      throw new Error('Failed to delete message');
    }
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

// Fetch all users (for messaging contacts)
export const fetchUsers = async (): Promise<UserData[]> => {
  try {
    // Fetching users (suppressed)
    const token = getAuthToken();
    
    if (!token) {
      console.warn('⚠️ No auth token found. User needs to login.');
      return [];
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    
    const response = await fetch(`${API_BASE_URL}/auth/users`, { headers });
    
    if (response.status === 401) {
      console.error('❌ Unauthorized: Token expired or invalid');
      handleUnauthorized();
      return [];
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch users:', response.status, errorText);
      return [];
    }
    
    const data = await response.json();
    // Fetched users (suppressed)
    
    // Handle different response formats
    // Backend might return { users: [...] } or just [...]
    const users = data.users || data;
    
    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    // Return empty array instead of throwing to prevent app crash
    return [];
  }
};

// Fetch a single user by id
export const fetchUserById = async (id: string): Promise<UserData | null> => {
  try {
    if (!id) return null
    const token = getAuthToken()
    if (!token) {
      console.warn('⚠️ No auth token found when fetching user by id')
      return null
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }

    const response = await fetch(`${API_BASE_URL}/auth/users/${encodeURIComponent(id)}`, { headers })
    if (!response.ok) {
      console.error('❌ Failed to fetch user by id:', response.status)
      return null
    }

    const data = await response.json()
    // backend may return { user: { ... } } or the user object directly
    return data.user || data || null
  } catch (error) {
    console.error('❌ Error fetching user by id:', error)
    return null
  }
}

// Fetch conversation summaries for current user (single request)
export const fetchConversations = async (limit = 50, skip = 0): Promise<any[]> => {
  try {
    // Fetching conversation summaries (suppressed)
    const token = getAuthToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    // Determine current user id from local storage so the local API route can run aggregation server-side
    let currentUserId: string | null = null
    try {
      const authData = localStorage.getItem('auth-storage')
      if (authData) {
        const parsed = JSON.parse(authData)
        const u = parsed.state?.user
        currentUserId = u?._id || u?.id || null
      }
    } catch (e) {
      // ignore
    }

    const url = `/api/messages/conversations?limit=${Math.min(limit, 100)}&skip=${Math.max(0, skip)}${currentUserId ? `&userId=${encodeURIComponent(currentUserId)}` : ''}`
    const response = await fetch(url, { headers })

    if (response.status === 401) {
      console.error('❌ Unauthorized when fetching conversations')
      handleUnauthorized()
      return []
    }

    if (!response.ok) {
      const text = await response.text()
      console.error('❌ Failed to fetch conversations:', response.status, text)
      return []
    }

    const data = await response.json()
    // Fetched conversations (suppressed)
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('❌ Error fetching conversations:', error)
    return []
  }
}

// Forgot Password - Request OTP
export const requestPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Requesting password reset OTP (suppressed)
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    // Response status/data suppressed
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Backend error:', data);
      const errorMessage = data.message || data.error || `Server error (${response.status})`;
      throw new Error(errorMessage);
    }
    
    console.log('✅ OTP sent successfully');
    return { success: true, message: data.message || 'OTP sent to your email' };
  } catch (error) {
    console.error('❌ Error requesting password reset:', error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Failed to process request. Please try again.');
  }
};

// Verify OTP
export const verifyOTP = async (email: string, otp: string): Promise<{ success: boolean; resetToken?: string; message: string }> => {
  try {
    // Verifying OTP (suppressed)
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    
    // Response status/data suppressed
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Backend error:', data);
      const errorMessage = data.message || data.error || `Server error (${response.status})`;
      throw new Error(errorMessage);
    }
    
    console.log('✅ OTP verified successfully');
    return { success: true, resetToken: data.resetToken, message: 'OTP verified' };
  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Failed to verify OTP. Please try again.');
  }
};

// Reset Password
export const resetPassword = async (resetToken: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Resetting password (suppressed)
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken, newPassword })
    });
    
    // Response status/data suppressed
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Backend error:', data);
      const errorMessage = data.message || data.error || `Server error (${response.status})`;
      throw new Error(errorMessage);
    }
    
    console.log('✅ Password reset successfully');
    return { success: true, message: data.message || 'Password reset successful' };
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Failed to reset password. Please try again.');
  }
};
