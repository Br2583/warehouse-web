// Avatar-specific compression: tiny output for storing as text in PocketBase
const AVATAR_MAX_PX   = 256;
const AVATAR_QUALITY  = 0.70;
const AVATAR_MAX_BYTES = 80 * 1024; // 80 KB

export function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        let { width, height } = img;
        // Crop to square from center, then resize
        const side = Math.min(width, height);
        const sx = (width  - side) / 2;
        const sy = (height - side) / 2;
        const out = Math.min(side, AVATAR_MAX_PX);
        const canvas = document.createElement('canvas');
        canvas.width = out;
        canvas.height = out;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
        const dataUrl = canvas.toDataURL('image/jpeg', AVATAR_QUALITY);
        const byteLen = Math.round((dataUrl.length * 3) / 4);
        if (byteLen > AVATAR_MAX_BYTES) {
          reject(new Error('Image is too large. Please choose a smaller photo.'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.80;
const MAX_OUTPUT_BYTES = 1200 * 1024; // 1.2 MB after compression

export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error(`"${file.name}" is not an image`));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        let { width, height } = img;

        // Scale down if either dimension exceeds MAX_DIMENSION
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

        // Guard: if still too large after compression, reject with a clear message
        const byteLen = Math.round((dataUrl.length * 3) / 4);
        if (byteLen > MAX_OUTPUT_BYTES) {
          reject(new Error(`"${file.name}" is too large to upload even after compression`));
          return;
        }

        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
