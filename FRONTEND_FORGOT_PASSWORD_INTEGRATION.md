# Frontend Integration - Forgot Password with OTP

## Overview
This guide shows how to integrate the forgot password feature with OTP verification into your React Native/React frontend.

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/forgot-password` | POST | Request OTP via email |
| `/api/auth/verify-otp` | POST | Verify OTP and get reset token |
| `/api/auth/reset-password` | POST | Reset password with token |

---

## Quick Integration (3 Steps)

### Step 1: Request OTP (Send Email)

**Endpoint:** `POST /api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "message": "OTP sent to your email. Please check your inbox.",
  "expiresIn": 300
}
```

**React Native Example:**
```javascript
const requestPasswordReset = async (email) => {
  try {
    const response = await fetch('https://rentify-server-ge0f.onrender.com/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    
    if (response.ok) {
      alert('OTP sent! Check your email.');
      // Navigate to OTP verification screen
      navigation.navigate('VerifyOTP', { email });
    } else {
      alert(data.message || 'Failed to send OTP');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Network error. Please try again.');
  }
};
```

---

### Step 2: Verify OTP

**Endpoint:** `POST /api/auth/verify-otp`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "message": "OTP verified successfully",
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (Error - Invalid OTP):**
```json
{
  "message": "Invalid OTP",
  "attemptsLeft": 2
}
```

**React Native Example:**
```javascript
const verifyOTP = async (email, otp) => {
  try {
    const response = await fetch('https://rentify-server-ge0f.onrender.com/api/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp }),
    });

    const data = await response.json();
    
    if (response.ok) {
      // Save reset token (pass to next screen)
      navigation.navigate('ResetPassword', { 
        resetToken: data.resetToken,
        email 
      });
    } else {
      if (data.attemptsLeft !== undefined) {
        alert(`Invalid OTP. ${data.attemptsLeft} attempts left.`);
      } else {
        alert(data.message || 'OTP verification failed');
      }
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Network error. Please try again.');
  }
};
```

---

### Step 3: Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "newSecurePassword123"
}
```

**Response (Success):**
```json
{
  "message": "Password reset successfully. You can now login with your new password."
}
```

**React Native Example:**
```javascript
const resetPassword = async (resetToken, newPassword) => {
  try {
    const response = await fetch('https://rentify-server-ge0f.onrender.com/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resetToken, newPassword }),
    });

    const data = await response.json();
    
    if (response.ok) {
      alert('Password reset successful! Please login with your new password.');
      // Navigate to login screen
      navigation.navigate('Login');
    } else {
      alert(data.message || 'Failed to reset password');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Network error. Please try again.');
  }
};
```

---

## Complete React Native Component Example

### ForgotPasswordScreen.jsx

```javascript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://rentify-server-ge0f.onrender.com/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('Success', 'OTP sent to your email. Please check your inbox.');
        navigation.navigate('VerifyOTP', { email: email.toLowerCase().trim() });
      } else {
        Alert.alert('Error', data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <Text style={styles.subtitle}>Enter your email to receive an OTP</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleSendOTP}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Sending...' : 'Send OTP'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

---

### VerifyOTPScreen.jsx

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';

export default function VerifyOTPScreen({ route, navigation }) {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://rentify-server-ge0f.onrender.com/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();
      
      if (response.ok) {
        navigation.navigate('ResetPassword', { 
          resetToken: data.resetToken,
          email 
        });
      } else {
        if (data.attemptsLeft !== undefined) {
          Alert.alert('Error', `Invalid OTP. ${data.attemptsLeft} attempts left.`);
        } else {
          Alert.alert('Error', data.message || 'OTP verification failed');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://rentify-server-ge0f.onrender.com/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        Alert.alert('Success', 'New OTP sent to your email');
        setTimeLeft(300);
        setOtp('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code sent to{'\n'}{email}
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="000000"
        value={otp}
        onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        maxLength={6}
        editable={!loading}
      />
      
      <Text style={styles.timer}>
        Time remaining: {formatTime(timeLeft)}
      </Text>
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleVerifyOTP}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Verifying...' : 'Verify OTP'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.resendButton} 
        onPress={handleResendOTP}
        disabled={loading || timeLeft > 0}
      >
        <Text style={styles.resendText}>
          {timeLeft > 0 ? 'Resend OTP available after timer expires' : 'Resend OTP'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 10,
  },
  timer: {
    textAlign: 'center',
    color: '#667eea',
    marginBottom: 15,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  resendText: {
    color: '#667eea',
    fontSize: 14,
  },
});
```

---

### ResetPasswordScreen.jsx

```javascript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';

export default function ResetPasswordScreen({ route, navigation }) {
  const { resetToken, email } = route.params;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://rentify-server-ge0f.onrender.com/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword }),
      });

      const data = await response.json();
      
      if (response.ok) {
        Alert.alert(
          'Success',
          'Password reset successful! Please login with your new password.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Enter your new password</Text>
      
      <TextInput
        style={styles.input}
        placeholder="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        editable={!loading}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        editable={!loading}
      />
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleResetPassword}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

---

## Navigation Setup (React Navigation)

Add these screens to your navigation stack:

```javascript
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import VerifyOTPScreen from './screens/VerifyOTPScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';

// In your Stack.Navigator:
<Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
<Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
<Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
```

---

## Add "Forgot Password?" Link to Login Screen

```javascript
<TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
  <Text style={styles.forgotPassword}>Forgot Password?</Text>
</TouchableOpacity>
```

---

## Error Handling Reference

| Error Message | Status | Meaning |
|---------------|--------|---------|
| "Email is required" | 400 | Empty email field |
| "OTP expired or invalid" | 400 | OTP not found or expired (5 min) |
| "Invalid OTP" | 400 | Wrong OTP code entered |
| "Too many invalid attempts" | 429 | Used all 3 OTP attempts |
| "Invalid or expired reset token" | 400 | Reset token expired (15 min) |
| "Password must be at least 6 characters" | 400 | Weak password |

---

## Security Features

✅ **OTP expires in 5 minutes**  
✅ **Reset token expires in 15 minutes**  
✅ **Max 3 OTP verification attempts**  
✅ **Email addresses are case-insensitive**  
✅ **Password automatically hashed on server**  
✅ **OTP deleted after successful verification**  

---

## Testing Checklist

- [ ] User can request OTP by entering email
- [ ] Email is received with 6-digit code
- [ ] OTP verification works with correct code
- [ ] Error shown for invalid OTP
- [ ] Attempt counter decreases on wrong OTP
- [ ] Timer shows remaining time (5 minutes)
- [ ] Resend OTP button works after timer expires
- [ ] Password reset succeeds with valid token
- [ ] User can login with new password
- [ ] Proper error messages for all failure cases

---

## Production Notes

**API Base URL:**
- Development: `http://localhost:10000`
- Production: `https://rentify-server-ge0f.onrender.com`

**Update all fetch URLs in production:**
```javascript
const API_BASE = 'https://rentify-server-ge0f.onrender.com/api/auth';
```

**Environment Variable (Optional):**
```javascript
const API_BASE = process.env.REACT_APP_API_URL || 'https://rentify-server-ge0f.onrender.com/api/auth';
```

---

## 🎉 Done!

Your frontend is now ready to integrate with the forgot password feature. Users can:
1. Request OTP via email
2. Verify OTP code
3. Reset their password
4. Login with new credentials

**Need help?** Check server logs for detailed error messages or test the API endpoints directly using the test script in the backend repo.
