import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { refreshToken, checkAuthStatus } from '../state/slices/userSlice';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Token storage keys
const ID_TOKEN_KEY = 'cognito_id_token';
const REFRESH_TOKEN_KEY = 'cognito_refresh_token';

// Platform-aware storage functions
const isWeb = Platform.OS === 'web';

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      return await AsyncStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },
};

// Token refresh interval: 3 minutes (180000 milliseconds)
const TOKEN_REFRESH_INTERVAL = 3 * 60 * 1000; // 3 minutes

/**
 * Component that manages automatic token refresh every 3 minutes
 * This component should be mounted at the root level of the app
 */
export default function TokenRefreshManager() {
  const dispatch = useDispatch();
  const { isAuthenticated, tokens } = useSelector((state: any) => state.user);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only set up automatic refresh if user is authenticated
    if (!isAuthenticated || !tokens?.idToken) {
      // Clear any existing interval if user is not authenticated
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Function to check and refresh token if needed
    const checkAndRefreshToken = async () => {
      try {
        const idToken = await storage.getItem(ID_TOKEN_KEY);
        
        if (!idToken) {
          return;
        }

        // Decode ID token to check expiration
        const idTokenParts = idToken.split('.');
        const idTokenPayload = JSON.parse(
          atob(idTokenParts[1].replace(/-/g, '+').replace(/_/g, '/'))
        );

        // Check if token is expired or will expire soon (within 1 minute)
        const currentTime = Math.floor(Date.now() / 1000);
        const expiresAt = idTokenPayload.exp || 0;
        const timeUntilExpiry = expiresAt - currentTime;

        // Refresh if token expires within 1 minute (proactive refresh)
        if (timeUntilExpiry < 60) {
          const refreshTokenValue = await storage.getItem(REFRESH_TOKEN_KEY);
          if (refreshTokenValue) {
            // Dispatch refresh token action
            try {
              await dispatch(refreshToken());
            } catch (error) {
              console.error('Automatic token refresh failed:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error checking token expiration:', error);
      }
    };

    // Check immediately on mount
    checkAndRefreshToken();

    // Set up interval to check every 3 minutes
    intervalRef.current = setInterval(() => {
      checkAndRefreshToken();
    }, TOKEN_REFRESH_INTERVAL);

    // Cleanup interval on unmount or when auth state changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, tokens?.idToken, dispatch]);

  // This component doesn't render anything
  return null;
}

