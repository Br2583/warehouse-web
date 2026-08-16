// Native camera/gallery picker via @capacitor/camera.
// Falls back to file input on web — callers handle the web path themselves.

export function isNativePlatform(): boolean {
  return typeof window !== 'undefined' && !!(window as any)?.Capacitor?.isNativePlatform?.();
}

// Opens the system chooser (Camera / Gallery) and returns a base64 data URI.
// Returns null if the user cancels or permission is denied.
export async function pickPhotoNative(): Promise<string | null> {
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
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
