'use client';

import { useEffect, useState, useRef } from 'react';
import { CameraIcon } from '@/components/icons';
import CameraCapture, { cameraCaptureSupported } from '@/components/CameraCapture';
import { dataUrlToFile, pickImagesFilesNative } from '@/lib/pick-photo';

const GalleryIcon = () => (
  <svg className="w-5 h-5 text-gray-400 mb-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  </svg>
);

/**
 * Camera / Gallery photo adder.
 *  · Camera → in-app multi-shot camera (getUserMedia) so several photos can be taken
 *    in one session. Falls back to the single-shot native/web picker where getUserMedia
 *    isn't available (old WebViews).
 *  · Gallery → multi-select: native Camera.pickImages, web <input multiple>.
 * Every produced photo is handed over one File at a time via onPhotoNative (web bulk
 * selection still routes through onFiles), matching the existing consumer contract.
 *
 * `remaining` (optional) = free photo slots; caps the camera and gallery multi-pick.
 */
export default function PhotoAddButton({ onFiles, onPhotoNative, remaining }: {
  onFiles: (files: FileList | null) => void;
  onPhotoNative: (photo: File) => void;
  remaining?: number;
}) {
  const isNativeRef = useRef(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    import('@capacitor/core').then(({ Capacitor }) => {
      isNativeRef.current = Capacitor.isNativePlatform();
    });
  }, []);

  // Fallback single-shot native camera (used only when getUserMedia is unavailable).
  const openNativeCameraOnce = async () => {
    setCamError(null);
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const perms = await Camera.checkPermissions();
      if (perms.camera === 'denied' || perms.photos === 'denied') {
        await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      }
      const photo = await Camera.getPhoto({
        quality: 80,
        width: 1200,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      if (photo.dataUrl) onPhotoNative(dataUrlToFile(photo.dataUrl));
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (!msg.includes('cancelled') && !msg.includes('cancel') && !msg.includes('No image')) {
        setCamError(msg || 'Camera error');
      }
    }
  };

  // Native gallery multi-select via Camera.pickImages → convert each to a File.
  const openNativeGallery = async () => {
    setCamError(null);
    try {
      const { Camera } = await import('@capacitor/camera');
      const perms = await Camera.checkPermissions();
      if (perms.photos === 'denied') {
        await Camera.requestPermissions({ permissions: ['photos'] });
      }
      const limit = typeof remaining === 'number' ? Math.max(1, remaining) : 0; // 0 = no limit
      const res = await Camera.pickImages({ quality: 80, width: 1600, limit });
      for (const p of res.photos || []) {
        const path = p.webPath || (p as any).path;
        if (!path) continue;
        try {
          const blob = await (await fetch(path)).blob();
          const ext = (p.format || 'jpg').replace('jpeg', 'jpg');
          onPhotoNative(new File([blob], `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`, { type: blob.type || 'image/jpeg' }));
        } catch { /* skip a single unreadable pick */ }
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (!msg.includes('cancel') && !msg.includes('No image')) setCamError(msg || 'Gallery error');
    }
  };

  const onCameraClick = () => {
    setCamError(null);
    if (cameraCaptureSupported()) { setShowCamera(true); return; }
    // getUserMedia unsupported → one-shot fallback.
    if (isNativeRef.current) openNativeCameraOnce();
    else cameraInputRef.current?.click();
  };

  const onGalleryClick = () => {
    setCamError(null);
    if (isNativeRef.current) openNativeGallery();
    else galleryInputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiles(e.target.files);
    e.target.value = '';
  };

  const btnCls = 'flex flex-col items-center justify-center h-16 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer w-full';

  return (
    <>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
      <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleChange} />

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={btnCls} onClick={onCameraClick}>
          <CameraIcon className="w-5 h-5 text-gray-400 mb-0.5" />
          <span className="text-xs text-gray-400">Camera</span>
        </button>
        <button type="button" className={btnCls} onClick={onGalleryClick}>
          <GalleryIcon />
          <span className="text-xs text-gray-400">Gallery</span>
        </button>
      </div>

      {camError && (
        <p className="text-xs text-red-500 mt-1 break-all">{camError}</p>
      )}

      <CameraCapture
        open={showCamera}
        max={remaining}
        onClose={() => setShowCamera(false)}
        onCapture={files => files.forEach(onPhotoNative)}
      />
    </>
  );
}
