import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export interface ImageUploadResult {
  uri: string;
  type: string;
  name: string;
}

/**
 * Request permissions for image picker (mobile only)
 */
export async function requestImagePermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true; // Web doesn't need permissions
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    alert('Sorry, we need camera roll permissions to upload images!');
    return false;
  }
  return true;
}

/**
 * Request camera permissions (mobile only)
 */
export async function requestCameraPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true; // Web doesn't need permissions
  }

  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    alert('Sorry, we need camera permissions to take photos!');
    return false;
  }
  return true;
}

/**
 * Pick an image from the device library (mobile) or file system (web)
 */
export async function pickImageFromLibrary(): Promise<ImageUploadResult | null> {
  try {
    if (Platform.OS === 'web') {
      // For web, use a file input
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: Event) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                uri: reader.result as string,
                type: file.type,
                name: file.name,
              });
            };
            reader.readAsDataURL(file);
          } else {
            resolve(null);
          }
        };
        input.click();
      });
    } else {
      // For mobile, use expo-image-picker
      const hasPermission = await requestImagePermissions();
      if (!hasPermission) {
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      const asset = result.assets[0];
      return {
        uri: asset.uri,
        type: 'image/jpeg', // expo-image-picker typically returns JPEG
        name: asset.uri.split('/').pop() || 'image.jpg',
      };
    }
  } catch (error) {
    console.error('Error picking image:', error);
    return null;
  }
}

/**
 * Take a photo using the camera (mobile only)
 */
export async function takePhoto(): Promise<ImageUploadResult | null> {
  try {
    if (Platform.OS === 'web') {
      // Web doesn't support camera directly, fall back to file picker
      return pickImageFromLibrary();
    }

    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) {
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      type: 'image/jpeg',
      name: asset.uri.split('/').pop() || 'photo.jpg',
    };
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
}

/**
 * Convert image URI to File object for upload (web)
 */
export function uriToFile(uri: string, name: string, type: string): File | null {
  if (Platform.OS !== 'web') {
    return null;
  }

  // For web, if it's a data URL, convert to File
  if (uri.startsWith('data:')) {
    const arr = uri.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || type;
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], name, { type: mime });
  }

  return null;
}

/**
 * Upload image to S3 using presigned URL
 */
export async function uploadImageToS3(
  imageUri: string,
  presignedUrl: string,
  contentType: string
): Promise<boolean> {
  try {
    let body: Blob | File | FormData;

    if (Platform.OS === 'web') {
      // For web, convert data URL to blob
      if (imageUri.startsWith('data:')) {
        const response = await fetch(imageUri);
        body = await response.blob();
      } else {
        const response = await fetch(imageUri);
        body = await response.blob();
      }
    } else {
      // For mobile, convert local URI to blob
      const response = await fetch(imageUri);
      body = await response.blob();
    }

    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: body,
    });

    return uploadResponse.ok;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    return false;
  }
}


