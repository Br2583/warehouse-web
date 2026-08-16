// Native camera/gallery picker via Capacitor bridge.
// Uses window.Capacitor.Plugins.Camera directly — avoids dynamic-import
// chunk-loading issues when the WebView loads a remote URL.

export function isNativePlatform(): boolean {
  return typeof window !== 'undefined' && !!(window as any)?.Capacitor?.isNativePlatform?.();
}

// Opens the system chooser (Camera / Gallery) and returns a base64 data URI.
// Returns null if the user cancels — callers should fall back to file input.
export async function pickPhotoNative(): Promise<string | null> {
  try {
    const Camera = (window as any)?.Capacitor?.Plugins?.Camera;
    if (!Camera?.getPhoto) return null;

    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: 'base64',  // CameraResultType.Base64
      source: 'PROMPT',      // CameraSource.Prompt — shows camera vs gallery chooser
    });

    if (!photo?.base64String) return null;
    const mime = photo.format === 'png' ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${photo.base64String}`;
  } catch {
    // User cancelled or permission denied — not an error
    return null;
  }
}
