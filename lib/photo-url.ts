'use client';

import { useEffect, useState } from 'react';
import { pb } from './pb';

/**
 * Photo file fields are marked `protected` in PocketBase, because vault photos
 * show a client's belongings. Reading one needs a short-lived file token, so
 * every <img> on the page goes through here instead of building its own URL.
 *
 * Tokens are cached and refreshed well before they expire; a page that stays
 * open all shift keeps working.
 */

type FileRecord = { id: string; collectionId?: string; collectionName?: string };

/** Thumb presets must match the `thumbs` configured on the PocketBase field. */
export type PhotoSize = 'grid' | 'tile' | 'full';

const THUMB: Record<PhotoSize, string | undefined> = {
  tile: '100x100', // small previews in lists
  grid: '300x300', // photo grids and cards
  full: undefined, // lightbox — original
};

let cachedToken = '';
let cachedAt = 0;
let inflight: Promise<string> | null = null;

// PocketBase file tokens are short-lived; refresh with room to spare.
const TOKEN_TTL_MS = 90 * 1000;

export async function getPhotoToken(): Promise<string> {
  if (cachedToken && Date.now() - cachedAt < TOKEN_TTL_MS) return cachedToken;
  if (inflight) return inflight;
  inflight = pb.files
    .getToken()
    .then(t => {
      cachedToken = t;
      cachedAt = Date.now();
      return t;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Drops the cached token — call on logout so the next page fetches a fresh one. */
export function clearPhotoToken(): void {
  cachedToken = '';
  cachedAt = 0;
}

/**
 * Builds the URL for one photo. `token` comes from usePhotoToken(); until it
 * arrives this returns '' so the caller can render a placeholder rather than a
 * broken image.
 */
export function photoUrl(
  record: FileRecord,
  filename: string | undefined,
  size: PhotoSize = 'grid',
  token = '',
): string {
  if (!filename || !token) return '';
  const thumb = THUMB[size];
  return pb.files.getURL(record, filename, thumb ? { thumb, token } : { token });
}

// One object URL per File, reused across renders so a form does not spawn a new
// one on every keystroke. The WeakMap entry disappears when the File does.
const previewCache = new WeakMap<File, string>();

/**
 * Source for one photo in a form, where the list mixes filenames already stored
 * in R2 with Files the user just picked and has not saved yet.
 */
export function photoSrc(
  photo: string | File,
  record: FileRecord,
  size: PhotoSize = 'grid',
  token = '',
): string {
  if (typeof photo !== 'string') {
    let url = previewCache.get(photo);
    if (!url) {
      url = URL.createObjectURL(photo);
      previewCache.set(photo, url);
    }
    return url;
  }
  return photoUrl(record, photo, size, token);
}

/**
 * Supplies a file token to a component and keeps it fresh. Returns '' on the
 * first render, which every caller must treat as "not ready yet".
 */
export function usePhotoToken(): string {
  const [token, setToken] = useState('');

  useEffect(() => {
    let active = true;
    const load = () => {
      getPhotoToken()
        .then(t => { if (active) setToken(t); })
        .catch(() => { if (active) setToken(''); });
    };
    load();
    const id = setInterval(load, TOKEN_TTL_MS);
    return () => { active = false; clearInterval(id); };
  }, []);

  return token;
}
