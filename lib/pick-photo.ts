// Native camera/gallery picker via @capacitor/camera.
// Static import ensures the plugin is bundled and registered before first use.

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export function isNativePlatform(): boolean {
  return typeof window !== 'undefined' && !!(window as any)?.Capacitor?.isNativePlatform?.();
}

// Opens the system chooser (Camera / Gallery) and returns a base64 data URI.
// Returns null if the user cancels.
export async function pickPhotoNative(): Promise<string | null> {
  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
    });
    if (!photo.base64String) return null;
    const mime = photo.format === 'png' ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${photo.base64String}`;
  } catch {
    return null;
  }
}
