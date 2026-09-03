'use client';

/**
 * Saves a photo to the device. Uses the native share sheet when available
 * (Capacitor WebView / mobile), falling back to a plain download link on the
 * web. Best-effort: any failure is swallowed so a viewer never gets an error.
 */
export async function downloadPhoto(url: string, name: string): Promise<void> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const file = new File([blob], name || 'photo.jpg', { type: blob.type || 'image/jpeg' });
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean; share?: (d: unknown) => Promise<void> };
    if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file] });
      return;
    }
    const obj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = obj;
    a.download = name || 'photo.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(obj), 1000);
  } catch {
    /* best effort */
  }
}
