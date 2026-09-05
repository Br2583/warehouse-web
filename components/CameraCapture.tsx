'use client';

/**
 * In-app multi-shot camera (getUserMedia). Opens a live viewfinder so the user can
 * take several photos in one session — snap, snap, snap, then "Done" — instead of
 * the one-shot-and-close behaviour of <input capture> / @capacitor/camera.getPhoto.
 *
 * Works in the PWA and inside the Capacitor Android WebView (which already holds the
 * CAMERA permission). Callers should only open it when getUserMedia is supported
 * (see cameraCaptureSupported) and fall back to the single-shot picker otherwise.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { XMarkIcon, TrashIcon } from '@/components/icons';
import { isNativePlatform } from '@/lib/pick-photo';
import { useOverlayBack } from '@/lib/overlay-back';

export function cameraCaptureSupported(): boolean {
  return typeof navigator !== 'undefined'
    && !!navigator.mediaDevices
    && typeof navigator.mediaDevices.getUserMedia === 'function';
}

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (files: File[]) => void; // all shots, handed over once on "Done"
  max?: number;                       // remaining slots; omitted = unlimited
};

const MAX_SIDE = 1600; // downscale longest edge to keep files small

export default function CameraCapture({ open, onClose, onCapture, max }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [shots, setShots] = useState<File[]>([]);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const remaining = typeof max === 'number' ? Math.max(0, max - shots.length) : Infinity;
  const atLimit = remaining <= 0;

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startStream = useCallback(async (mode: 'environment' | 'user') => {
    stopStream();
    setError(null);
    setStarting(true);
    try {
      // On native, make sure the OS-level camera permission is granted first;
      // getUserMedia inside the WebView needs it.
      if (isNativePlatform()) {
        try {
          const { Camera } = await import('@capacitor/camera');
          const p = await Camera.checkPermissions();
          if (p.camera !== 'granted') await Camera.requestPermissions({ permissions: ['camera'] });
        } catch { /* plugin missing — let getUserMedia try anyway */ }
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e: any) {
      const name = e?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('Camera access was denied. Allow the camera in your settings and try again.');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setError('No camera was found on this device.');
      } else {
        setError('The camera could not be started. Use the gallery instead.');
      }
    } finally {
      setStarting(false);
    }
  }, [stopStream]);

  // Start / stop with the overlay, and restart when the facing camera flips.
  useEffect(() => {
    if (!open) { stopStream(); return; }
    startStream(facing);
    return () => stopStream();
  }, [open, facing, startStream, stopStream]);

  // Reset shots whenever the overlay is (re)opened.
  useEffect(() => {
    if (open) setShots([]);
  }, [open]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || atLimit || starting || error) return;
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return;
    const scale = Math.min(1, MAX_SIDE / Math.max(vw, vh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      blob => {
        if (!blob) return;
        const file = new File([blob], `photo-${Date.now()}-${shots.length + 1}.jpg`, { type: 'image/jpeg' });
        setShots(s => (typeof max === 'number' ? [...s, file].slice(0, max) : [...s, file]));
      },
      'image/jpeg',
      0.85,
    );
  };

  // Object URLs for the thumbnail strip — revoked when the set changes / on close.
  const previews = useMemo(() => shots.map(f => URL.createObjectURL(f)), [shots]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const removeShot = (i: number) => setShots(s => s.filter((_, idx) => idx !== i));

  const cancel = () => { stopStream(); setShots([]); onClose(); };

  const done = () => {
    stopStream();
    if (shots.length) onCapture(shots);
    setShots([]);
    onClose();
  };

  // Android hardware back closes the camera (hook stays above the early return).
  useOverlayBack(open, cancel);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-14 text-white flex-shrink-0">
        <button type="button" onClick={cancel} aria-label="Close camera" className="p-2 -ml-2 rounded-full hover:bg-white/10">
          <XMarkIcon className="w-6 h-6" />
        </button>
        <span className="text-sm font-medium tabular-nums">
          {shots.length}{typeof max === 'number' ? ` / ${max}` : ''}
        </span>
        <button
          type="button"
          onClick={() => setFacing(f => (f === 'environment' ? 'user' : 'environment'))}
          aria-label="Switch camera"
          className="p-2 -mr-2 rounded-full hover:bg-white/10 disabled:opacity-40"
          disabled={starting || !!error}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 9.5 18 7m0 0-2.5-2.5M18 7H8a4 4 0 0 0-4 4M8.5 14.5 6 17m0 0 2.5 2.5M6 17h10a4 4 0 0 0 4-4" />
          </svg>
        </button>
      </div>

      {/* Viewfinder */}
      <div className="relative flex-1 min-h-0 overflow-hidden flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {starting && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-white/90 text-sm">{error}</p>
            <button type="button" onClick={cancel} className="px-5 py-2 rounded-full bg-white text-gray-900 text-sm font-medium">
              Close
            </button>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {shots.length > 0 && (
        <div className="flex gap-2 px-4 py-2 overflow-x-auto flex-shrink-0">
          {shots.map((_, i) => (
            <div key={i} className="relative flex-shrink-0">
              <img src={previews[i]} alt="" className="w-14 h-14 object-cover rounded-lg border border-white/20" />
              <button
                type="button"
                onClick={() => removeShot(i)}
                aria-label="Remove photo"
                className="absolute -top-1.5 -right-1.5 bg-black/70 text-white rounded-full p-0.5"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between px-8 h-24 flex-shrink-0">
        <div className="w-16" />
        <button
          type="button"
          onClick={capture}
          disabled={atLimit || starting || !!error}
          aria-label="Take photo"
          className="w-16 h-16 rounded-full border-4 border-white bg-white/20 active:bg-white/40 disabled:opacity-40 transition-colors"
        >
          <span className="block w-full h-full rounded-full border-2 border-black/10" />
        </button>
        <button
          type="button"
          onClick={done}
          disabled={shots.length === 0}
          className="w-16 text-right text-white font-medium text-sm disabled:opacity-40"
        >
          Done
        </button>
      </div>
    </div>
  );
}
