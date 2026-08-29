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

const tokenIsFresh = () => !!cachedToken && Date.now() - cachedAt < TOKEN_TTL_MS;

export async function getPhotoToken(): Promise<string> {
  if (tokenIsFresh()) return cachedToken;
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

/**
 * Warms the token as soon as the user is authenticated, so opening a vault does
 * not spend a round trip before it can even ask for the first image.
 */
export function prefetchPhotoToken(): void {
  if (!pb.authStore.isValid || tokenIsFresh() || inflight) return;
  getPhotoToken().catch(() => {});
}

// Neutral grey tile shown while the token is still in flight. Without it an
// empty src renders as a broken-image icon, which is what the photo grids were
// showing on first paint.
const PLACEHOLDER =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="%23f1f2f4"/></svg>',
  );

/** Drops the cached token — call on logout so the next page fetches a fresh one. */
export function clearPhotoToken(): void {
  cachedToken = '';
  cachedAt = 0;
}

/**
 * PocketBase builds a thumbnail the first time one is requested and caches it
 * from then on — measured at ~1.8s for the first hit. Requesting them right
 * after a save means the person who later opens the vault gets the cached copy.
 * Fire-and-forget: failures here must never surface.
 */
export function warmThumbnails(record: FileRecord, filenames: unknown): void {
  if (typeof window === 'undefined' || !Array.isArray(filenames)) return;
  getPhotoToken()
    .then(token => {
      for (const name of filenames) {
        if (typeof name !== 'string' || !name) continue;
        for (const size of ['tile', 'grid'] as PhotoSize[]) {
          const url = photoUrl(record, name, size, token);
          if (url && url !== PLACEHOLDER) fetch(url, { cache: 'force-cache' }).catch(() => {});
        }
      }
    })
    .catch(() => {});
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
  if (!filename) return PLACEHOLDER;
  const t = token || (tokenIsFresh() ? cachedToken : '');
  if (!t) return PLACEHOLDER;
  const thumb = THUMB[size];
  return pb.files.getURL(record, filename, thumb ? { thumb, token: t } : { token: t });
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
  // Start from the cache so a page opened after the token was warmed paints the
  // real photos on the very first render, with no placeholder flash.
  const [token, setToken] = useState(() => (tokenIsFresh() ? cachedToken : ''));

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
