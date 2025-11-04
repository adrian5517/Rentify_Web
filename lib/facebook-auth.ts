/**
 * Facebook OAuth Authentication Utilities
 * Handles Facebook Login integration for Rentify
 */

// Facebook SDK Types
declare global {
  interface Window {
    FB: any
    fbAsyncInit: () => void
  }
}

export interface FacebookAuthResponse {
  accessToken: string
  userID: string
  expiresIn: number
  signedRequest: string
  graphDomain: string
  data_access_expiration_time: number
}

export interface FacebookUserData {
  id: string
  name: string
  email: string
  picture?: {
    data: {
      url: string
    }
  }
  first_name?: string
  last_name?: string
}

/**
 * Initialize Facebook SDK
 */
export function initFacebookSDK(): Promise<void> {
  return new Promise((resolve) => {
    // Check if already loaded
    if (window.FB) {
      resolve()
      return
    }

    // Load Facebook SDK script
    const script = document.createElement('script')
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.async = true
    script.defer = true
    script.crossOrigin = 'anonymous'
    
    script.onload = () => {
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        })
        resolve()
      }
    }

    document.body.appendChild(script)
  })
}

/**
 * Check Facebook login status
 */
export function checkFacebookLoginStatus(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('Facebook SDK not loaded'))
      return
    }

    window.FB.getLoginStatus((response: any) => {
      resolve(response)
    })
  })
}

/**
 * Login with Facebook
 */
export function loginWithFacebook(): Promise<FacebookAuthResponse> {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('Facebook SDK not loaded'))
      return
    }

    window.FB.login(
      (response: any) => {
        if (response.status === 'connected') {
          resolve(response.authResponse)
        } else {
          reject(new Error('Facebook login failed or was cancelled'))
        }
      },
      { 
        scope: 'public_profile,email',
        return_scopes: true 
      }
    )
  })
}

/**
 * Get Facebook user data
 */
export function getFacebookUserData(): Promise<FacebookUserData> {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('Facebook SDK not loaded'))
      return
    }

    window.FB.api(
      '/me',
      { fields: 'id,name,email,picture.type(large),first_name,last_name' },
      (response: any) => {
        if (response && !response.error) {
          resolve(response)
        } else {
          reject(new Error(response?.error?.message || 'Failed to get user data'))
        }
      }
    )
  })
}

/**
 * Logout from Facebook
 */
export function logoutFromFacebook(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('Facebook SDK not loaded'))
      return
    }

    window.FB.logout((response: any) => {
      resolve()
    })
  })
}

/**
 * Complete Facebook authentication flow
 * Returns user data and access token
 */
export async function authenticateWithFacebook(): Promise<{
  userData: FacebookUserData
  accessToken: string
}> {
  try {
    // Initialize SDK if not already done
    await initFacebookSDK()

    // Login with Facebook
    const authResponse = await loginWithFacebook()

    // Get user data
    const userData = await getFacebookUserData()

    return {
      userData,
      accessToken: authResponse.accessToken
    }
  } catch (error) {
    console.error('Facebook authentication error:', error)
    throw error
  }
}

/**
 * Send Facebook token to backend for verification and user creation
 */
export async function verifyFacebookToken(
  accessToken: string,
  userData: FacebookUserData
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch('https://rentify-server-ge0f.onrender.com/api/auth/facebook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken,
        userData: {
          facebookId: userData.id,
          name: userData.name,
          email: userData.email,
          profilePicture: userData.picture?.data?.url,
          firstName: userData.first_name,
          lastName: userData.last_name,
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Facebook authentication failed')
    }

    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Facebook authentication failed',
    }
  }
}
