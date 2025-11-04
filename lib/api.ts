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
const getAuthToken = (): string | null => {
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
    console.log('🔄 Fetching messages:', { userId1, userId2 });
    const url = `${API_BASE_URL}/messages/${userId1}/${userId2}`;
    console.log('📡 API URL:', url);
    
    const token = getAuthToken();
    console.log('🔑 Auth token included:', !!token);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { headers });
    console.log('📥 Response status:', response.status);
    
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
        console.log('ℹ️ No messages found, returning empty array');
        return [];
      }
      
      throw new Error(`Failed to fetch messages: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ Fetched messages:', data);
    return data;
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    
    // Return empty array instead of throwing error to prevent app crash
    console.log('⚠️ Returning empty messages array due to error');
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
      throw new Error('Failed to send message');
    }

    return await response.json();
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
    console.log('👥 Fetching users from backend...');
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
    console.log('✅ Fetched users from backend:', data);
    
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
