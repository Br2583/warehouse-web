// Client-side image compression. Returns real File objects for PocketBase file
// fields — photos live in R2, not as base64 text inside the database row.

const AVATAR_MAX_PX = 256;
const AVATAR_QUALITY = 0.70;
const AVATAR_MAX_BYTES = 80 * 1024; // 80 KB

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.80;
const MAX_OUTPUT_BYTES = 1200 * 1024; // 1.2 MB after compression

/** canvas.toBlob wrapped in a promise, since it only offers a callback. */
function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Failed to encode image'))),
      'image/jpeg',
      quality,
    );
  });
}

/** Loads a File into an <img>, rejecting on unreadable or undecodable input. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    // Allow empty file.type — the Android camera returns "" for fresh captures
    if (file.type && !file.type.startsWith('image/')) {
      reject(new Error(`"${file.name}" is not an image`));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = e => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => resolve(img);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function jpegName(original: string): string {
  const base = (original || 'photo').replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').slice(0, 40);
  return `${base || 'photo'}.jpg`;
}

/**
 * Square-cropped, downscaled avatar as a base64 data URL.
 *
 * Avatars stay in the database on purpose: at 80 KB they are not what was
 * bloating it, and moving them would touch auth, the member list and the
 * session shape. Vault photos — 1.2 MB each, six per vault — are the ones that
 * had to move, and they return real Files below.
 */
export async function compressAvatar(file: File): Promise<string> {
  const img = await loadImage(file);
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  const out = Math.min(side, AVATAR_MAX_PX);

  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);

  const dataUrl = canvas.toDataURL('image/jpeg', AVATAR_QUALITY);
  if (Math.round((dataUrl.length * 3) / 4) > AVATAR_MAX_BYTES) {
    throw new Error('Image is too large. Please choose a smaller photo.');
  }
  return dataUrl;
}

/** Downscaled vault/item photo as a File, under MAX_OUTPUT_BYTES. */
export async function compressImage(file: File): Promise<File> {
  const img = await loadImage(file);
  let { width, height } = img;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0, width, height);

  // Try at JPEG_QUALITY first; if still over the limit, halve it
  let blob = await toBlob(canvas, JPEG_QUALITY);
  if (blob.size > MAX_OUTPUT_BYTES) {
    blob = await toBlob(canvas, JPEG_QUALITY / 2);
  }
  return new File([blob], jpegName(file.name), { type: 'image/jpeg' });
}
