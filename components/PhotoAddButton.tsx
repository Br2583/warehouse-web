'use client';

import { useEffect, useState, useRef } from 'react';
import { CameraIcon } from '@/components/icons';

const GalleryIcon = () => (
  <svg className="w-5 h-5 text-gray-400 mb-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  </svg>
);

export default function PhotoAddButton({ onFiles, onPhotoNative }: {
  onFiles: (files: FileList | null) => void;
  onPhotoNative: (b64: string) => void;
}) {
  const isNativeRef = useRef(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    import('@capacitor/core').then(({ Capacitor }) => {
      isNativeRef.current = Capacitor.isNativePlatform();
    });
  }, []);

  const openNativeCamera = async (source: 'camera' | 'gallery') => {
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
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      });
      if (photo.dataUrl) onPhotoNative(photo.dataUrl);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (!msg.includes('cancelled') && !msg.includes('cancel') && !msg.includes('No image')) {
        setCamError(msg || 'Camera error');
      }
    }
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
        <button
          type="button"
          className={btnCls}
          onClick={() => isNativeRef.current ? openNativeCamera('camera') : cameraInputRef.current?.click()}
        >
          <CameraIcon className="w-5 h-5 text-gray-400 mb-0.5" />
          <span className="text-xs text-gray-400">Camera</span>
        </button>
        <button
          type="button"
          className={btnCls}
          onClick={() => isNativeRef.current ? openNativeCamera('gallery') : galleryInputRef.current?.click()}
        >
          <GalleryIcon />
          <span className="text-xs text-gray-400">Gallery</span>
        </button>
      </div>

      {camError && (
        <p className="text-xs text-red-500 mt-1 break-all">{camError}</p>
      )}
    </>
  );
}
