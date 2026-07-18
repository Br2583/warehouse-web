'use client';

import { useEffect, useRef, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface QRScannerProps {
  onClose: () => void;
  onResult: (vaultId: string) => void;
  inline?: boolean;
}

export default function QRScanner({ onClose, onResult, inline = false }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);
  const [error, setError] = useState('');
  const [found, setFound] = useState(false);

  useEffect(() => {
    doneRef.current = false;
    let jsQRLib: ((data: Uint8ClampedArray, width: number, height: number) => { data: string } | null) | null = null;

    const start = async () => {
      // Load jsQR once
      try {
        const mod = await import('jsqr');
        jsQRLib = mod.default;
      } catch {
        setError('Failed to load scanner library.');
        return;
      }

      // Start camera
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        setError('Cannot access camera. Please allow camera permission.');
        return;
      }

      if (doneRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.play().catch(() => {});

      // Scan every 400ms
      intervalRef.current = setInterval(() => {
        if (doneRef.current || !jsQRLib) return;
        const v = videoRef.current;
        const c = canvasRef.current;
        if (!v || !c || v.readyState < 2) return;

        c.width = v.videoWidth;
        c.height = v.videoHeight;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(v, 0, 0, c.width, c.height);

        const img = ctx.getImageData(0, 0, c.width, c.height);
        const result = jsQRLib(img.data, img.width, img.height);
        if (!result) return;

        // Extract vault ID from any URL containing /vault/<id>
        const match = result.data.match(/\/vault\/([a-zA-Z0-9]+)/);
        if (match) {
          doneRef.current = true;
          clearInterval(intervalRef.current!);
          setFound(true);
          setTimeout(() => onResult(match[1]), 600);
        }
      }, 400);
    };

    start();

    return () => {
      doneRef.current = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [onResult]);

  const cameraBlock = (
    <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
      <canvas ref={canvasRef} className="hidden" />

      {/* Corner frame overlay */}
      {!found && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-56 h-56">
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-blue-400 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-blue-400 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-blue-400 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-blue-400 rounded-br-xl" />
            <div className="absolute left-3 right-3 h-0.5 bg-blue-400/90 rounded-full animate-scan-line" />
          </div>
        </div>
      )}

      {/* Success */}
      {found && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-bold text-lg">Vault found!</p>
          </div>
        </div>
      )}

      {/* Camera error overlay — visible in both inline and modal modes */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
          <div className="text-center text-white">
            <XMarkIcon className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-red-300">{error}</p>
          </div>
        </div>
      )}
    </div>
  );

  if (inline) return cameraBlock;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <div className="relative w-full max-w-sm mx-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-semibold text-sm">Scan Vault QR</p>
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {cameraBlock}

        {error ? (
          <p className="mt-3 text-center text-sm text-red-300">{error}</p>
        ) : (
          <p className="mt-3 text-center text-sm text-white/50">
            {found ? 'Opening vault...' : 'Point camera at a vault QR code'}
          </p>
        )}
      </div>
    </div>
  );
}
