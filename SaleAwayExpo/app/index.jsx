import React, { useState } from 'react';
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
  Text,
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  Surface,
  ActivityIndicator,
  HelperText,
} from 'react-native-paper';
import { signUp, confirmSignUp, clearError } from '../state/slices/userSlice';

export default function SignUpScreen() {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.user);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [signUpUsername, setSignUpUsername] = useState('');

  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [confirmationCodeError, setConfirmationCodeError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    // Password should be at least 8 characters
    return password.length >= 8;
  };

  const handleSignUp = async () => {
    // Reset errors
    setUsernameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    dispatch(clearError());

    let hasError = false;

    // Validate username
    if (!username.trim()) {
      setUsernameError('Username is required');
      hasError = true;
    }

    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }

    // Validate password
    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (!validatePassword(password)) {
      setPasswordError('Password must be at least 8 characters');
      hasError = true;
    }

    // Validate confirm password
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    try {
      const result = await dispatch(signUp({ username, email, password }));
      if (signUp.fulfilled.match(result)) {
        setSignUpUsername(username);
        setShowConfirmation(true);
      }
    } catch (error) {
      // Error is handled by Redux state
    }
  };

  const handleConfirmSignUp = async () => {
    setConfirmationCodeError('');
    dispatch(clearError());

    if (!confirmationCode.trim()) {
      setConfirmationCodeError('Confirmation code is required');
      return;
    }

    try {
      const result = await dispatch(confirmSignUp({ 
        username: signUpUsername, 
        confirmationCode 
      }));
      if (confirmSignUp.fulfilled.match(result)) {
        // Navigate to dashboard or sign in screen
        router.replace('/Dashboard');
      }
    } catch (error) {
      // Error is handled by Redux state
    }
  };

  const handleSignIn = () => {
    router.push('/signin');
  };

  if (showConfirmation) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Surface style={styles.card} elevation={2}>
            <Title style={styles.title}>Confirm Sign Up</Title>
            <Paragraph style={styles.subtitle}>
              Please enter the confirmation code sent to your email
            </Paragraph>

            <TextInput
              label="Confirmation Code"
              value={confirmationCode}
              onChangeText={setConfirmationCode}
              mode="outlined"
              style={styles.input}
              keyboardType="number-pad"
              error={!!confirmationCodeError}
            />
            <HelperText type="error" visible={!!confirmationCodeError}>
              {confirmationCodeError}
            </HelperText>

            {error && (
              <HelperText type="error" visible={!!error} style={styles.errorText}>
                {error}
              </HelperText>
            )}

            <Button
              mode="contained"
              onPress={handleConfirmSignUp}
              style={styles.button}
              buttonColor="#0F2439"
              loading={isLoading}
              disabled={isLoading}
            >
              Confirm Sign Up
            </Button>

            <Button
              mode="text"
              onPress={() => setShowConfirmation(false)}
              style={styles.secondaryButton}
            >
              Back to Sign Up
            </Button>
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Surface style={styles.card} elevation={2}>
          <Title style={styles.title}>Sign Up</Title>
          <Paragraph style={styles.subtitle}>
            Create an account to get started
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
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            error={!!emailError}
          />
          <HelperText type="error" visible={!!emailError}>
            {emailError}
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

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            style={styles.input}
            secureTextEntry
            error={!!confirmPasswordError}
          />
          <HelperText type="error" visible={!!confirmPasswordError}>
            {confirmPasswordError}
          </HelperText>

          {error && (
            <HelperText type="error" visible={!!error} style={styles.errorText}>
              {error}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleSignUp}
            style={styles.button}
            buttonColor="#0F2439"
            loading={isLoading}
            disabled={isLoading}
          >
            Sign Up
          </Button>

          <Button
            mode="text"
            onPress={handleSignIn}
            style={styles.secondaryButton}
          >
            Already have an account? Sign In
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
