import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import {
  TextInput,
  Button,
  Title,
  Paragraph,
  Surface,
  HelperText,
} from 'react-native-paper';
import { signIn, clearError } from '../state/slices/userSlice';

export default function SignInScreen() {
  const dispatch = useDispatch();
  const { isLoading, error, isAuthenticated } = useSelector((state) => state.user);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Navigate to Dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/Dashboard');
    }
  }, [isAuthenticated]);

  const handleSignIn = async () => {
    // Reset errors
    setUsernameError('');
    setPasswordError('');
    dispatch(clearError());

    let hasError = false;

    // Validate username
    if (!username.trim()) {
      setUsernameError('Username is required');
      hasError = true;
    }

    // Validate password
    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    try {
      const result = await dispatch(signIn({ username, password }));
      if (signIn.fulfilled.match(result)) {
        // Navigation will happen via useEffect when isAuthenticated changes
        router.replace('/Dashboard');
      }
    } catch (error) {
      // Error is handled by Redux state
    }
  };

  const handleSignUp = () => {
    router.push('/');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Surface style={styles.card} elevation={2}>
          <Title style={styles.title}>Sign In</Title>
          <Paragraph style={styles.subtitle}>
            Sign in to your account to continue
          </Paragraph>

          <TextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
            error={!!usernameError}
          />
          <HelperText type="error" visible={!!usernameError}>
            {usernameError}
          </HelperText>

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            style={styles.input}
            secureTextEntry
            error={!!passwordError}
          />
          <HelperText type="error" visible={!!passwordError}>
            {passwordError}
          </HelperText>

          {error && (
            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {error}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleSignIn}
            style={styles.button}
            buttonColor="#0F2439"
            loading={isLoading}
            disabled={isLoading}
          >
            Sign In
          </Button>

          <Button
            mode="text"
            onPress={handleSignUp}
            style={styles.secondaryButton}
          >
            Don't have an account? Sign Up
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    padding: 24,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F2439',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 16,
    opacity: 0.7,
  },
  input: {
    marginBottom: 4,
  },
  button: {
    marginTop: 16,
    paddingVertical: 4,
  },
  secondaryButton: {
    marginTop: 12,
  },
  errorText: {
    marginTop: 8,
    marginBottom: 8,
  },
});

