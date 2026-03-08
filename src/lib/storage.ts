import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * @param file The file to upload.
 * @param path The path in storage (e.g., 'products/product-1.jpg').
 * @returns Promise with the download URL.
 */
export async function uploadFile(file: File, path: string): Promise<string> {
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        return getDownloadURL(snapshot.ref);
    } catch (error) {
        console.error('Error uploading file to Firebase Storage:', error);
        throw new Error('No se pudo subir la imagen. Verifica tu conexión o configuración de Firebase.');
    }
}

/**
 * Deletes a file from Firebase Storage.
 * @param fullUrl The full URL of the file to delete.
 */
export async function deleteFileFromUrl(fullUrl: string): Promise<void> {
    try {
        const storageRef = ref(storage, fullUrl);
        await deleteObject(storageRef);
    } catch (error) {
        console.warn('Could not delete file from Firebase Storage:', error);
    }
}

/**
 * Generates a standard path for product images.
 */
export function getProductImagePath(productId: string, originalName: string): string {
    const extension = originalName.split('.').pop();
    return `products/${productId}-${Date.now()}.${extension}`;
}

/**
 * Generates a standard path for user avatars.
 */
export function getUserAvatarPath(userId: string, originalName: string): string {
    const extension = originalName.split('.').pop();
    return `avatars/${userId}-${Date.now()}.${extension}`;
}
