/**
 * Firebase Storage helpers for tenant branding assets.
 */
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getStorageInstance } from './config';
import { getTenantId } from './auth';

/**
 * Upload a branding asset (logo or favicon) to Firebase Storage.
 * Path: tenants/{tenantId}/branding/{type}
 * Returns the public download URL.
 */
export async function uploadBrandingAsset(
  file: File,
  type: 'logo' | 'favicon'
): Promise<string> {
  const tenantId = await getTenantId();
  const storage = getStorageInstance();
  const storageRef = ref(storage, `tenants/${tenantId}/branding/${type}`);
  await uploadBytes(storageRef, file, {
    contentType: file.type,
    cacheControl: 'public, max-age=3600',
  });
  return getDownloadURL(storageRef);
}

/**
 * Delete a branding asset from Firebase Storage.
 */
export async function deleteBrandingAsset(
  type: 'logo' | 'favicon'
): Promise<void> {
  const tenantId = await getTenantId();
  const storage = getStorageInstance();
  const storageRef = ref(storage, `tenants/${tenantId}/branding/${type}`);
  try {
    await deleteObject(storageRef);
  } catch (err: any) {
    // Ignore "object not found" errors
    if (err.code !== 'storage/object-not-found') throw err;
  }
}
