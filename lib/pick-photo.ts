// Native camera/gallery picker via @capacitor/camera.
// Static import ensures the plugin is bundled and registered before first use.

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export function isNativePlatform(): boolean {
  return typeof window !== 'undefined' && !!(window as any)?.Capacitor?.isNativePlatform?.();
}

/**
 * The native camera returns a base64 data URL, but the photo pipeline (compression +
 * R2 upload, or avatar compression) works with File objects — the same shape a web
 * <input type=file> yields. Convert here so every consumer receives a File.
 */
export function dataUrlToFile(dataUrl: string, name = `photo-${Date.now()}`): File {
  const [head, body] = dataUrl.split(',');
  const mime = head.match(/data:(.*?);/)?.[1] || 'image/jpeg';
  const bin = atob(body || '');
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const ext = (mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  return new File([arr], `${name}.${ext}`, { type: mime });
}

/**
 * Opens the native system chooser (Camera / Gallery) and returns a File, or null if
 * the user cancels. Throws only on an unexpected failure (permission/hardware), so
 * callers can show an error. Use this on native instead of a raw <input type=file>,
 * which the Android WebView often fails to open.
 */
export async function pickPhotoFileNative(
  source: 'prompt' | 'camera' | 'gallery' = 'prompt',
): Promise<File | null> {
  const src =
    source === 'camera' ? CameraSource.Camera :
    source === 'gallery' ? CameraSource.Photos :
    CameraSource.Prompt;
  try {
    const perms = await Camera.checkPermissions();
    if (perms.camera === 'denied' || perms.photos === 'denied') {
      await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
    }
    const photo = await Camera.getPhoto({
      quality: 80,
      width: 1200,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: src,
    });
    return photo.dataUrl ? dataUrlToFile(photo.dataUrl) : null;
  } catch (err: any) {
    const msg = (err?.message || String(err)).toLowerCase();
    // User cancelled the picker — not an error.
    if (msg.includes('cancel') || msg.includes('no image')) return null;
    throw err;
  }
}

/**
 * Native multi-select from the gallery via Camera.pickImages → File[]. `limit` 0 = no
 * cap. Returns [] if the user cancels; throws only on an unexpected failure.
 */
export async function pickImagesFilesNative(limit = 0): Promise<File[]> {
  try {
    const perms = await Camera.checkPermissions();
    if (perms.photos === 'denied') await Camera.requestPermissions({ permissions: ['photos'] });
    const res = await Camera.pickImages({ quality: 80, width: 1600, limit });
    const out: File[] = [];
    for (const p of res.photos || []) {
      const path = p.webPath || (p as any).path;
      if (!path) continue;
      try {
        const blob = await (await fetch(path)).blob();
        const ext = (p.format || 'jpg').replace('jpeg', 'jpg');
        out.push(new File(
          [blob],
          `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`,
          { type: blob.type || 'image/jpeg' },
        ));
      } catch { /* skip a single unreadable pick */ }
    }
    return out;
  } catch (err: any) {
    const msg = (err?.message || String(err)).toLowerCase();
    if (msg.includes('cancel') || msg.includes('no image')) return [];
    throw err;
  }
}
