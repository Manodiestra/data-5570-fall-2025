import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Cognito configuration from environment variables
// Values come from .env file (with EXPO_PUBLIC_ prefix for Expo)
const COGNITO_REGION = process.env.EXPO_PUBLIC_COGNITO_REGION || 'us-east-1';
const COGNITO_CLIENT_ID = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID || '';

// Token storage keys
const ACCESS_TOKEN_KEY = 'cognito_access_token';
const ID_TOKEN_KEY = 'cognito_id_token';
const REFRESH_TOKEN_KEY = 'cognito_refresh_token';

// Platform-aware storage functions
// expo-secure-store doesn't work on web, so we use AsyncStorage as fallback
const isWeb = Platform.OS === 'web';

const storage = {
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      return await AsyncStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },
  async deleteItem(key: string): Promise<void> {
    if (isWeb) {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

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

export interface SignInPayload {
  username: string;
  password: string;
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
      const requestBody = {
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
      const requestBody = {
        ClientId: COGNITO_CLIENT_ID,
        Username: username,
        ConfirmationCode: confirmationCode,
      };
      
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
  SignInPayload,
  { rejectValue: string }
>(
  'user/signIn',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const requestBody = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      };
      
      const response = await fetch(
        `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`,
        {
          method: 'POST',
          headers: {
            'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
            'Content-Type': 'application/x-amz-json-1.1',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.__type || errorData.message || 'Sign in failed');
      }

      const data = await response.json();
      
      // Extract tokens from response
      const accessToken = data.AuthenticationResult.AccessToken;
      const idToken = data.AuthenticationResult.IdToken;
      const refreshToken = data.AuthenticationResult.RefreshToken;
      
      // Decode ID token to get user info
      const idTokenParts = idToken.split('.');
      const idTokenPayload = JSON.parse(
        atob(idTokenParts[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      
      // Store tokens securely
      await storage.setItem(ACCESS_TOKEN_KEY, accessToken);
      await storage.setItem(ID_TOKEN_KEY, idToken);
      if (refreshToken) {
        await storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      
      return {
        user: {
          username: idTokenPayload['cognito:username'] || idTokenPayload.sub,
          email: idTokenPayload.email,
          sub: idTokenPayload.sub,
        },
        tokens: {
          accessToken: accessToken,
          idToken: idToken,
          refreshToken: refreshToken,
        },
      };
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
      await storage.deleteItem(ACCESS_TOKEN_KEY);
      await storage.deleteItem(ID_TOKEN_KEY);
      await storage.deleteItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Sign out failed');
    }
  }
);

export const refreshToken = createAsyncThunk<
  { user: any; tokens: any },
  void,
  { rejectValue: string }
>(
  'user/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const refreshTokenValue = await storage.getItem(REFRESH_TOKEN_KEY);
      
      if (!refreshTokenValue) {
        throw new Error('No refresh token available');
      }
      
      const requestBody = {
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: {
          REFRESH_TOKEN: refreshTokenValue,
        },
      };
      
      const response = await fetch(
        `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`,
        {
          method: 'POST',
          headers: {
            'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
            'Content-Type': 'application/x-amz-json-1.1',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.__type || errorData.message || 'Token refresh failed');
      }

      const data = await response.json();
      
      // Extract tokens from response
      const accessToken = data.AuthenticationResult.AccessToken;
      const idToken = data.AuthenticationResult.IdToken;
      // Note: Refresh token is not returned in refresh response, keep the existing one
      
      // Decode ID token to get user info
      const idTokenParts = idToken.split('.');
      const idTokenPayload = JSON.parse(
        atob(idTokenParts[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      
      // Store new tokens securely
      await storage.setItem(ACCESS_TOKEN_KEY, accessToken);
      await storage.setItem(ID_TOKEN_KEY, idToken);
      // Keep the existing refresh token
      
      return {
        user: {
          username: idTokenPayload['cognito:username'] || idTokenPayload.sub,
          email: idTokenPayload.email,
          sub: idTokenPayload.sub,
        },
        tokens: {
          accessToken: accessToken,
          idToken: idToken,
          refreshToken: refreshTokenValue, // Keep existing refresh token
        },
      };
    } catch (error) {
      // If refresh fails, clear all tokens
      await storage.deleteItem(ACCESS_TOKEN_KEY);
      await storage.deleteItem(ID_TOKEN_KEY);
      await storage.deleteItem(REFRESH_TOKEN_KEY);
      return rejectWithValue(error instanceof Error ? error.message : 'Token refresh failed');
    }
  }
);

export const checkAuthStatus = createAsyncThunk<
  { user: any; tokens: any } | null,
  void,
  { rejectValue: string }
>(
  'user/checkAuthStatus',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const idToken = await storage.getItem(ID_TOKEN_KEY);
      
      if (!idToken) {
        return null;
      }
      
      // Decode ID token to check expiration
      const idTokenParts = idToken.split('.');
      const idTokenPayload = JSON.parse(
        atob(idTokenParts[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      
      // Check if token is expired or will expire soon (within 30 seconds)
      const currentTime = Math.floor(Date.now() / 1000);
      const expiresAt = idTokenPayload.exp || 0;
      const timeUntilExpiry = expiresAt - currentTime;
      
      if (timeUntilExpiry < 30) {
        // Token expired or expiring soon, try to refresh
        const refreshTokenValue = await storage.getItem(REFRESH_TOKEN_KEY);
        if (refreshTokenValue) {
          // Attempt to refresh the token
          const refreshResult = await dispatch(refreshToken());
          if (refreshToken.fulfilled.match(refreshResult)) {
            return refreshResult.payload;
          } else {
            // Refresh failed, return null to indicate user needs to sign in again
            return null;
          }
        } else {
          // No refresh token available, clear tokens
          await storage.deleteItem(ACCESS_TOKEN_KEY);
          await storage.deleteItem(ID_TOKEN_KEY);
          return null;
        }
      }
      
      const accessToken = await storage.getItem(ACCESS_TOKEN_KEY);
      
      return {
        user: {
          username: idTokenPayload['cognito:username'] || idTokenPayload.sub,
          email: idTokenPayload.email,
          sub: idTokenPayload.sub,
        },
        tokens: {
          accessToken: accessToken,
          idToken: idToken,
          refreshToken: await storage.getItem(REFRESH_TOKEN_KEY),
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
      const idToken = await storage.getItem(ID_TOKEN_KEY);
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
    
    // Refresh token
    builder
      .addCase(refreshToken.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.error = null;
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        state.error = action.payload || 'Token refresh failed';
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

