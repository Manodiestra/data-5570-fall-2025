# AWS Cognito Authentication Setup Guide

This guide will help you integrate AWS Cognito authentication into your SaleAway project, following the pattern from the example repository.

## Prerequisites

- AWS Cognito User Pool ID: `us-east-1_xQf6ajVGZ`
- You need to obtain your App Client ID from AWS Cognito Console
- You need to configure your Cognito User Pool domain (for Hosted UI)

---

## Part 1: Django Backend Setup

### Step 1: Install Required Python Packages

Navigate to your Django backend directory and install the required packages:

```bash
cd djangoBackendcloudflared tunnel --url http://localhost:8000
source ../myvenv/bin/activate  # or activate your virtual environment
pip install python-jose[cryptography] requests python-dotenv
```

**Note:** We'll use `python-jose` for JWT validation instead of a Django-specific package, as it gives us more control and follows the pattern from the example.

### Step 2: Create Authentication Module

Create a new file `djangoBackend/SaleAway/authentication.py`:

```python
import os
import requests
from jose import jwt, jwk
from jose.utils import base64url_decode
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
import json


class CognitoJWTAuthentication(BaseAuthentication):
    """
    Custom authentication class for AWS Cognito JWT tokens.
    Validates JWT tokens from Cognito using JWKS (JSON Web Key Set).
    """
    
    def authenticate(self, request):
        # Get the token from the Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        
        try:
            # Validate and decode the token
            user_data = self.validate_token(token)
            return (user_data, token)  # Return (user, token) tuple
        except Exception as e:
            raise AuthenticationFailed(f'Invalid token: {str(e)}')
    
    def validate_token(self, token):
        """
        Validate JWT token against Cognito JWKS.
        Returns decoded token payload with user information.
        """
        # Get Cognito configuration from settings
        region = os.getenv('COGNITO_REGION', 'us-east-1')
        user_pool_id = os.getenv('COGNITO_USER_POOL_ID', 'us-east-1_xQf6ajVGZ')
        
        # Get the JWKS URL for the user pool
        jwks_url = f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json'
        
        # Fetch JWKS
        try:
            jwks_response = requests.get(jwks_url)
            jwks_response.raise_for_status()
            jwks = jwks_response.json()
        except requests.RequestException as e:
            raise AuthenticationFailed(f'Failed to fetch JWKS: {str(e)}')
        
        # Get the unverified header to find the key ID
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get('kid')
        
        # Find the matching key in JWKS
        key = None
        for jwk_key in jwks['keys']:
            if jwk_key['kid'] == kid:
                key = jwk_key
                break
        
        if not key:
            raise AuthenticationFailed('Unable to find matching key in JWKS')
        
        # Construct the public key
        public_key = jwk.construct(key)
        
        # Verify and decode the token
        try:
            # Decode without verification first to get claims
            claims = jwt.get_unverified_claims(token)
            
            # Verify token claims
            issuer = f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}'
            if claims.get('iss') != issuer:
                raise AuthenticationFailed('Invalid token issuer')
            
            if claims.get('token_use') != 'id':
                raise AuthenticationFailed('Token is not an ID token')
            
            # Verify signature
            message, signature = str(token).rsplit('.', 1)
            decoded_signature = base64url_decode(signature)
            
            if not public_key.verify(message.encode('utf-8'), decoded_signature):
                raise AuthenticationFailed('Token signature verification failed')
            
            # Check expiration
            import time
            if claims.get('exp', 0) < time.time():
                raise AuthenticationFailed('Token has expired')
            
            # Return user data from token
            return {
                'username': claims.get('cognito:username') or claims.get('sub'),
                'email': claims.get('email'),
                'sub': claims.get('sub'),
                'token_use': claims.get('token_use'),
            }
            
        except jwt.JWTError as e:
            raise AuthenticationFailed(f'Token validation failed: {str(e)}')
```

### Step 3: Update Django Settings

Update `djangoBackend/djangoBackend/settings.py` to add:

1. **Add REST Framework configuration with Cognito authentication:**
   Add this after the `INSTALLED_APPS` section:

```python
# REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'SaleAway.authentication.CognitoJWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

2. **Load environment variables:**
   Add this at the top of `settings.py` after the imports:

```python
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()
```

3. **Add Cognito configuration:**
   Add this near the end of `settings.py`:

```python
# AWS Cognito Configuration
COGNITO_REGION = os.getenv('COGNITO_REGION', 'us-east-1')
COGNITO_USER_POOL_ID = os.getenv('COGNITO_USER_POOL_ID', 'us-east-1_xQf6ajVGZ')
COGNITO_APP_CLIENT_ID = os.getenv('COGNITO_APP_CLIENT_ID', '')
```

### Step 4: Create .env File

Create a `.env` file in the `djangoBackend` directory:

```bash
cd djangoBackend
touch .env
```

Add the following to `.env`:

```
COGNITO_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_xQf6ajVGZ
COGNITO_APP_CLIENT_ID=your_app_client_id_here
```

**Important:** Replace `your_app_client_id_here` with your actual App Client ID from AWS Cognito.

### Step 5: Update Views to Use Authentication

Update `djangoBackend/SaleAway/views.py` to protect your views:

```python
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Listing, Location
from .serializers import ListingSerializer, LocationSerializer

class ListingViewSet(viewsets.ModelViewSet):
    queryset = Listing.objects.all()
    serializer_class = ListingSerializer
    permission_classes = [IsAuthenticated]  # Changed from AllowAny
    
    def get_queryset(self):
        return Listing.objects.all().order_by('-list_date')


class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated]  # Changed from AllowAny
    
    def get_queryset(self):
        return Location.objects.all().order_by('-created_date')
```

---

## Part 2: Expo Frontend Setup

### Step 1: Install Required NPM Packages

Navigate to your Expo app directory and install the required packages:

```bash
cd SaleAwayExpo
npm install aws-amplify expo-secure-store @react-native-async-storage/async-storage
```

**Note:** `expo-secure-store` is used for securely storing tokens on mobile, and `async-storage` is a fallback for web.

### Step 2: Create Auth Slice

Create `SaleAwayExpo/state/slices/authSlice.ts`:

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

// Complete the web browser session for OAuth
WebBrowser.maybeCompleteAuthSession();

// Cognito configuration from environment variables
// Values come from .env file (with EXPO_PUBLIC_ prefix for Expo)
const COGNITO_REGION = process.env.EXPO_PUBLIC_COGNITO_REGION || 'us-east-1';
const COGNITO_USER_POOL_ID = process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-asdfasdf';
const COGNITO_CLIENT_ID = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID || '';
const COGNITO_DOMAIN = process.env.EXPO_PUBLIC_COGNITO_USER_POOL_DOMAIN || '';

// Token storage keys
const ACCESS_TOKEN_KEY = 'cognito_access_token';
const ID_TOKEN_KEY = 'cognito_id_token';
const REFRESH_TOKEN_KEY = 'cognito_refresh_token';

// Generate PKCE code verifier and challenge
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest('SHA-256', data);
}

function base64URLEncode(str: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hashed = await sha256(verifier);
  return base64URLEncode(hashed);
}

// Types
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    username: string | null;
    email: string | null;
    sub: string | null;
  } | null;
  tokens: {
    accessToken: string | null;
    idToken: string | null;
    refreshToken: string | null;
  } | null;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  tokens: null,
  error: null,
};

// Async thunks
export const signIn = createAsyncThunk<
  { user: any; tokens: any },
  void,
  { rejectValue: string }
>(
  'auth/signIn',
  async (_, { rejectWithValue }) => {
    try {
      // Generate PKCE parameters
      const codeVerifier = generateRandomString(128);
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      
      // Store code verifier for later use
      await SecureStore.setItemAsync('code_verifier', codeVerifier);
      
      // Create authorization URL
      const redirectUri = Linking.createURL('auth/callback');
      const authUrl = `${COGNITO_DOMAIN}/oauth2/authorize?` +
        `client_id=${COGNITO_CLIENT_ID}&` +
        `response_type=code&` +
        `scope=email+openid+profile&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `code_challenge=${codeChallenge}&` +
        `code_challenge_method=S256`;
      
      // Open browser for authentication
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        
        if (!code) {
          throw new Error('No authorization code received');
        }
        
        // Exchange code for tokens
        const codeVerifier = await SecureStore.getItemAsync('code_verifier');
        if (!codeVerifier) {
          throw new Error('Code verifier not found');
        }
        
        const tokenUrl = `${COGNITO_DOMAIN}/oauth2/token`;
        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: COGNITO_CLIENT_ID,
            code: code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
          }).toString(),
        });
        
        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          throw new Error(errorData.error_description || 'Failed to exchange code for tokens');
        }
        
        const tokenData = await tokenResponse.json();
        
        // Decode ID token to get user info
        const idTokenParts = tokenData.id_token.split('.');
        const idTokenPayload = JSON.parse(
          atob(idTokenParts[1].replace(/-/g, '+').replace(/_/g, '/'))
        );
        
        // Store tokens securely
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokenData.access_token);
        await SecureStore.setItemAsync(ID_TOKEN_KEY, tokenData.id_token);
        if (tokenData.refresh_token) {
          await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokenData.refresh_token);
        }
        
        return {
          user: {
            username: idTokenPayload['cognito:username'] || idTokenPayload.sub,
            email: idTokenPayload.email,
            sub: idTokenPayload.sub,
          },
          tokens: {
            accessToken: tokenData.access_token,
            idToken: tokenData.id_token,
            refreshToken: tokenData.refresh_token,
          },
        };
      } else {
        throw new Error('Authentication cancelled or failed');
      }
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Sign in failed');
    }
  }
);

export const signOut = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      // Clear stored tokens
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(ID_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync('code_verifier');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Sign out failed');
    }
  }
);

export const checkAuthStatus = createAsyncThunk<
  { user: any; tokens: any } | null,
  void,
  { rejectValue: string }
>(
  'auth/checkAuthStatus',
  async (_, { rejectWithValue }) => {
    try {
      const idToken = await SecureStore.getItemAsync(ID_TOKEN_KEY);
      
      if (!idToken) {
        return null;
      }
      
      // Decode ID token to check expiration
      const idTokenParts = idToken.split('.');
      const idTokenPayload = JSON.parse(
        atob(idTokenParts[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      
      // Check if token is expired
      const currentTime = Math.floor(Date.now() / 1000);
      if (idTokenPayload.exp && idTokenPayload.exp < currentTime) {
        // Token expired, try to refresh
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          // TODO: Implement token refresh logic
          await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
          await SecureStore.deleteItemAsync(ID_TOKEN_KEY);
          await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
          return null;
        } else {
          await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
          await SecureStore.deleteItemAsync(ID_TOKEN_KEY);
          return null;
        }
      }
      
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      
      return {
        user: {
          username: idTokenPayload['cognito:username'] || idTokenPayload.sub,
          email: idTokenPayload.email,
          sub: idTokenPayload.sub,
        },
        tokens: {
          accessToken: accessToken,
          idToken: idToken,
          refreshToken: await SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
        },
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to check auth status');
    }
  }
);

export const getAuthToken = createAsyncThunk<string | null, void>(
  'auth/getAuthToken',
  async () => {
    try {
      const idToken = await SecureStore.getItemAsync(ID_TOKEN_KEY);
      return idToken;
    } catch (error) {
      return null;
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Sign in
    builder
      .addCase(signIn.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.error = null;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = action.payload || 'Sign in failed';
      });
    
    // Sign out
    builder
      .addCase(signOut.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        state.error = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Sign out failed';
      });
    
    // Check auth status
    builder
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.tokens = action.payload.tokens;
        } else {
          state.isAuthenticated = false;
          state.user = null;
          state.tokens = null;
        }
        state.error = null;
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = action.payload || 'Failed to check auth status';
      });
    
    // Get auth token
    builder.addCase(getAuthToken.fulfilled, (state, action) => {
      // Token fetched, but don't change auth state
    });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
```

### Step 3: Update Redux Store

Update `SaleAwayExpo/state/store.ts` to include the auth reducer:

```typescript
import { configureStore } from '@reduxjs/toolkit';
import listItemsReducer from './slices/listItemsSlice';
import locationsReducer from './slices/locationsSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    listItems: listItemsReducer,
    locations: locationsReducer,
    auth: authReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Step 4: Update API Calls to Include Auth Token

Update `SaleAwayExpo/state/slices/listItemsSlice.ts` to include authentication tokens in API calls.

First, create a helper function at the top of the file (after imports):

```typescript
import * as SecureStore from 'expo-secure-store';

const ID_TOKEN_KEY = 'cognito_id_token';

// Helper function to get auth token
async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ID_TOKEN_KEY);
  } catch (error) {
    return null;
  }
}

// Helper function to make authenticated fetch requests
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}
```

Then update all fetch calls in the thunks to use `fetchWithAuth` instead of `fetch`:

- `fetchItems`: Change `fetch(API_BASE_URL)` to `fetchWithAuth(API_BASE_URL)`
- `createItem`: Change `fetch(API_BASE_URL, {...})` to `fetchWithAuth(API_BASE_URL, {...})`
- `updateItemAsync`: Change `fetch(...)` to `fetchWithAuth(...)`
- `deleteItem`: Change `fetch(...)` to `fetchWithAuth(...)`

### Step 5: Update index.jsx to Handle Authentication

Update `SaleAwayExpo/app/index.jsx` to check authentication status and redirect if not authenticated:

Add these imports at the top:

```typescript
import { useEffect } from 'react';
import { checkAuthStatus, signIn, signOut } from '../state/slices/authSlice';
```

Then update the component to check auth status:

```typescript
export default function ItemListingScreen() {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.listItems);
  const { isAuthenticated, isLoading: authLoading, user } = useSelector((state) => state.auth);

  // Check authentication status on mount
  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // You can show a login screen or redirect
      // For now, we'll just show a message
      console.log('User not authenticated');
    }
  }, [isAuthenticated, authLoading]);

  // Rest of your component...
```

### Step 6: Configure Environment Variables

Create a `.env` file in the `SaleAwayExpo` directory to store your Cognito configuration. This file should **not** be committed to version control.

```bash
cd SaleAwayExpo
touch .env
```

Add the following to `.env`:

```
EXPO_PUBLIC_COGNITO_REGION=us-east-1
EXPO_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xQf6ajVGZ
EXPO_PUBLIC_COGNITO_CLIENT_ID=your_app_client_id_here
EXPO_PUBLIC_COGNITO_USER_POOL_DOMAIN=https://your-domain.auth.us-east-1.amazoncognito.com
```

**Important:** 
- Replace `your_app_client_id_here` with your actual App Client ID
- Replace `your-domain` with your Cognito User Pool domain (you need to configure this in AWS Cognito Console)
- The `EXPO_PUBLIC_` prefix is required for Expo to expose these variables to your app

**Security Note:** Make sure `.env` is in your `.gitignore` file. If it's not already there, add it:

```bash
echo ".env" >> .gitignore
```

You may also want to create a `.env.example` file (without sensitive values) to document what environment variables are needed:

```bash
touch .env.example
```

Add this to `.env.example`:

```
EXPO_PUBLIC_COGNITO_REGION=us-east-1
EXPO_PUBLIC_COGNITO_USER_POOL_ID=your_user_pool_id_here
EXPO_PUBLIC_COGNITO_CLIENT_ID=your_app_client_id_here
EXPO_PUBLIC_COGNITO_USER_POOL_DOMAIN=https://your-domain.auth.us-east-1.amazoncognito.com
```

### Step 7: Update app.json for Deep Linking

Update `SaleAwayExpo/app.json` to ensure the auth callback scheme is configured. In the `expo` section, ensure you have:

```json
{
  "expo": {
    "scheme": "saleawayexpo",
    // ... rest of your config
  }
}
```

This should already be there, but verify it matches your app scheme. The scheme is used for OAuth redirects (e.g., `saleawayexpo://auth/callback`).

---

## Part 3: AWS Cognito Configuration

### Step 1: Configure App Client

1. Go to AWS Cognito Console
2. Select your User Pool (`us-east-1_xQf6ajVGZ`)
3. Go to "App integration" tab
4. Note your App Client ID
5. Under "Hosted UI", ensure:
   - Allowed callback URLs include: `saleawayexpo://auth/callback`
   - Allowed sign-out URLs include: `saleawayexpo://auth/callback`
   - OAuth 2.0 grant types include: "Authorization code grant"
   - OAuth 2.0 scopes include: "openid", "email", "profile"

### Step 2: Configure User Pool Domain

1. In your User Pool, go to "App integration" tab
2. Under "Domain", configure a domain (either Cognito domain or custom domain)
3. Note the domain URL - you'll need this for `EXPO_PUBLIC_COGNITO_USER_POOL_DOMAIN`

---

## Part 4: Testing

### Test Backend

1. Start Django server:
   ```bash
   cd djangoBackend
   python manage.py runserver
   ```

2. Test an authenticated request:
   ```bash
   # Get a token from Cognito (use Postman or curl)
   curl -X GET http://localhost:8000/api/listings/ \
     -H "Authorization: Bearer YOUR_ID_TOKEN_HERE"
   ```

### Test Frontend

1. Start Expo app:
   ```bash
   cd SaleAwayExpo
   npm start
   ```

2. The app should:
   - Check authentication status on launch
   - Show login button if not authenticated
   - Open Cognito Hosted UI when login is clicked
   - Store tokens securely after successful login
   - Include tokens in API requests

---

## Troubleshooting

### Common Issues

1. **"Invalid token" error in Django:**
   - Verify your `COGNITO_APP_CLIENT_ID` matches the App Client ID in AWS
   - Check that the token is being sent correctly in the Authorization header

2. **"Failed to fetch JWKS" error:**
   - Verify your `COGNITO_USER_POOL_ID` is correct
   - Check your internet connection

3. **Authentication flow doesn't start:**
   - Verify your `EXPO_PUBLIC_COGNITO_USER_POOL_DOMAIN` is correct
   - Check that the callback URL is configured in Cognito

4. **Tokens not being stored:**
   - On web, `expo-secure-store` uses `localStorage` as fallback
   - Verify your app has proper permissions

---

## Implementation Steps

1. Implement token refresh logic in `authSlice.ts`
2. Add error handling UI for authentication failures
3. Create a login screen component
4. Add logout functionality to your settings screen
5. Consider adding user profile information display

---

## Notes

- This implementation uses the Authorization Code Flow with PKCE, which is the recommended approach for mobile apps
- Tokens are stored securely using `expo-secure-store`
- The Django backend validates tokens using Cognito's JWKS endpoint
- All API requests from the frontend should include the ID token in the Authorization header

