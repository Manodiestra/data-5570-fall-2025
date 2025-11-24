import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Image } from 'expo-image';
import { createItem, generateListingData } from '../state/slices/listItemsSlice';
import { pickImageFromLibrary, takePhoto, uploadImageToS3 } from '../utils/imageUpload';

const API_BASE_URL = 'http://3.85.53.16:8000';

export default function AddListItemScreen() {
  const dispatch = useDispatch();
  const createLoading = useSelector((state) => state.listItems.createLoading);
  const generateLoading = useSelector((state) => state.listItems.generateLoading);
  const { tokens } = useSelector((state) => state.user);
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  
  const showAlert = (title, message, buttons) => {
    if (Platform.OS === 'web') {
      // Use browser's native alert for web
      alert(`${title}: ${message}`);
    } else {
      // Use React Native Alert for mobile platforms
      Alert.alert(title, message, buttons);
    }
  };

  const handleSubmit = async () => {
    console.log('handleSubmit');
    if (!itemName.trim() || !description.trim() || !price.trim()) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      showAlert('Error', 'Please enter a valid price');
      return;
    }

    // Create new item object
    const newItem = {
      name: itemName.trim(),
      description: description.trim(),
      price: numericPrice,
      ...(imageUrl && { image_url: imageUrl }),
    };

    try {
      // Post item to backend via thunk
      const result = await dispatch(createItem(newItem)).unwrap();
      
      // Clear form
      setItemName('');
      setDescription('');
      setPrice('');
      setSelectedImage(null);
      setImageUrl(null);
      
      // Navigate back to previous screen
      router.back();
    } catch (error) {
      showAlert('Error', `Failed to create item: ${error}`);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handlePickImage = async () => {
    const result = await pickImageFromLibrary();
    if (result) {
      setSelectedImage(result);
      await uploadImage(result);
    }
  };

  const handleTakePhoto = async () => {
    const result = await takePhoto();
    if (result) {
      setSelectedImage(result);
      await uploadImage(result);
    }
  };

  const uploadImage = async (imageResult) => {
    if (!imageResult) return;

    setUploadingImage(true);
    try {
      // Get presigned URL from Django
      const idToken = tokens?.idToken;
      if (!idToken) {
        showAlert('Error', 'You must be authenticated to upload images');
        setUploadingImage(false);
        return;
      }

      const presignedResponse = await fetch(`${API_BASE_URL}/api/presigned-url/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          file_name: imageResult.name,
          content_type: imageResult.type,
        }),
      });

      if (!presignedResponse.ok) {
        throw new Error('Failed to get presigned URL');
      }

      const { presigned_url, url } = await presignedResponse.json();

      // Upload image to S3
      const uploadSuccess = await uploadImageToS3(
        imageResult.uri,
        presigned_url,
        imageResult.type
      );

      if (uploadSuccess) {
        setImageUrl(url);
      } else {
        throw new Error('Failed to upload image to S3');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showAlert('Error', `Failed to upload image: ${error.message}`);
      setSelectedImage(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImageUrl(null);
  };

  const handleGenerateListing = async () => {
    if (!itemName.trim()) {
      showAlert('Error', 'Please enter a title first');
      return;
    }

    try {
      const result = await dispatch(generateListingData({ title: itemName.trim() })).unwrap();
      
      // Populate form fields with generated data
      setItemName(result.name);
      setDescription(result.description);
      setPrice(result.price.toString());
      
      // If image was generated, set the image URL
      if (result.image_url) {
        setImageUrl(result.image_url);
        // Create a preview object for the image display
        setSelectedImage({ uri: result.image_url });
      }
    } catch (error) {
      showAlert('Error', `Failed to generate listing data: ${error}`);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleGoBack}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add New Item</Text>
          <Text style={styles.subtitle}>List your item for sale</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <View style={styles.titleRow}>
              <Text style={styles.label}>Item Name *</Text>
              <TouchableOpacity
                style={[styles.generateButton, (!itemName.trim() || generateLoading) && styles.generateButtonDisabled]}
                onPress={handleGenerateListing}
                disabled={!itemName.trim() || generateLoading}
              >
                {generateLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.generateButtonText}>✨ Auto-Generate</Text>
                )}
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter item name"
              value={itemName}
              onChangeText={setItemName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your item..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>
              {description.length}/500 characters
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Price *</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={[styles.input, styles.priceInput]}
                placeholder="10"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                maxLength={10}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Image (Optional)</Text>
            {selectedImage && imageUrl ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.imagePreview}
                  contentFit="cover"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={removeImage}
                  disabled={uploadingImage}
                >
                  <Text style={styles.removeImageText}>Remove</Text>
                </TouchableOpacity>
                {uploadingImage && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color="white" />
                    <Text style={styles.uploadingText}>Uploading...</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.imageButtonsContainer}>
                {Platform.OS !== 'web' && (
                  <TouchableOpacity
                    style={[styles.imageButton, uploadingImage && styles.imageButtonDisabled]}
                    onPress={handleTakePhoto}
                    disabled={uploadingImage}
                  >
                    <Text style={styles.imageButtonText}>📷 Take Photo</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.imageButton, uploadingImage && styles.imageButtonDisabled]}
                  onPress={handlePickImage}
                  disabled={uploadingImage}
                >
                  <Text style={styles.imageButtonText}>
                    {Platform.OS === 'web' ? '📁 Choose File' : '🖼️ Choose from Library'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, createLoading && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={createLoading}
          >
            {createLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Add Item</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#95a5a6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
  },
  textArea: {
    height: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'right',
    marginTop: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  dollarSign: {
    fontSize: 18,
    fontWeight: '600',
    color: '#27ae60',
    paddingLeft: 12,
    paddingRight: 8,
  },
  priceInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  submitButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#3498db',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#95a5a6',
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  imageButton: {
    flex: 1,
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2980b9',
  },
  imageButtonDisabled: {
    opacity: 0.5,
  },
  imageButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#e1e8ed',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeImageText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: 'white',
    marginTop: 8,
    fontSize: 14,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  generateButton: {
    backgroundColor: '#9b59b6',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#9b59b6',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  generateButtonDisabled: {
    backgroundColor: '#95a5a6',
    opacity: 0.6,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
