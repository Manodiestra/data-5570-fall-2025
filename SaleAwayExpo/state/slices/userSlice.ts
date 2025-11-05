import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

// Complete the web browser session for OAuth
WebBrowser.maybeCompleteAuthSession();

// Cognito configuration from environment variables
// Values come from .env file (with EXPO_PUBLIC_ prefix for Expo)
const COGNITO_REGION = process.env.EXPO_PUBLIC_COGNITO_REGION || 'us-east-1';
const COGNITO_USER_POOL_ID = process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_xQf6ajVGZ';
const COGNITO_CLIENT_ID = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID || '';
const COGNITO_CLIENT_SECRET = process.env.EXPO_PUBLIC_COGNITO_CLIENT_SECRET || '';
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

// Generate SECRET_HASH for Cognito API calls when client secret is enabled
// SECRET_HASH = HMAC-SHA256(USERNAME + CLIENT_ID, CLIENT_SECRET)
async function generateSecretHash(username: string): Promise<string> {
  if (!COGNITO_CLIENT_SECRET) {
    return '';
  }
  
  const encoder = new TextEncoder();
  const message = encoder.encode(username + COGNITO_CLIENT_ID);
  const key = encoder.encode(COGNITO_CLIENT_SECRET);
  
  // Import key for HMAC
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Sign the message
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
  
  // Convert to standard base64 (AWS Cognito expects standard base64, not base64url)
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Types
export interface UserState {
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

export interface SignUpPayload {
  username: string;
  email: string;
  password: string;
}

export interface ConfirmSignUpPayload {
  username: string;
  confirmationCode: string;
}

const initialState: UserState = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  tokens: null,
  error: null,
};

// Async thunks
export const signUp = createAsyncThunk<
  { username: string; email: string },
  SignUpPayload,
  { rejectValue: string }
>(
  'user/signUp',
  async ({ username, email, password }, { rejectWithValue }) => {
    try {
      // Generate SECRET_HASH if client secret is configured
      const secretHash = await generateSecretHash(username);
      
      const requestBody: any = {
        ClientId: COGNITO_CLIENT_ID,
        Username: username,
        Password: password,
        UserAttributes: [
          {
            Name: 'email',
            Value: email,
          },
        ],
      };
      
      // Add SECRET_HASH if client secret is configured
      if (secretHash) {
        requestBody.SecretHash = secretHash;
      }
      
      const response = await fetch(
        `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`,
        {
          method: 'POST',
          headers: {
            'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp',
            'Content-Type': 'application/x-amz-json-1.1',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.__type || errorData.message || 'Sign up failed');
      }

      const data = await response.json();
      return {
        username: data.UserSub || username,
        email: email,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Sign up failed');
    }
  }
);

export const confirmSignUp = createAsyncThunk<
  { username: string },
  ConfirmSignUpPayload,
  { rejectValue: string }
>(
  'user/confirmSignUp',
  async ({ username, confirmationCode }, { rejectWithValue }) => {
    try {
      // Generate SECRET_HASH if client secret is configured
      const secretHash = await generateSecretHash(username);
      
      const requestBody: any = {
        ClientId: COGNITO_CLIENT_ID,
        Username: username,
        ConfirmationCode: confirmationCode,
      };
      
      // Add SECRET_HASH if client secret is configured
      if (secretHash) {
        requestBody.SecretHash = secretHash;
      }
      
      const response = await fetch(
        `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`,
        {
          method: 'POST',
          headers: {
            'X-Amz-Target': 'AWSCognitoIdentityProviderService.ConfirmSignUp',
            'Content-Type': 'application/x-amz-json-1.1',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.__type || errorData.message || 'Confirmation failed');
      }

      return { username };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Confirmation failed');
    }
  }
);

export const signIn = createAsyncThunk<
  { user: any; tokens: any },
  void,
  { rejectValue: string }
>(
  'user/signIn',
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
  'user/signOut',
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
  'user/checkAuthStatus',
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
  'user/getAuthToken',
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
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Sign up
    builder
      .addCase(signUp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
        // Note: User is not authenticated yet until they confirm sign up
      })
      .addCase(signUp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Sign up failed';
      });
    
    // Confirm sign up
    builder
      .addCase(confirmSignUp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(confirmSignUp.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
        // User confirmed, but still needs to sign in
      })
      .addCase(confirmSignUp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Confirmation failed';
      });
    
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

export const { clearError } = userSlice.actions;
export default userSlice.reducer;

