'use client';

import { useEffect, useRef } from 'react';

/**
 * Global overlay back-stack.
 *
 * Modals, sheets, forms and lightboxes in this app are React state, not routes.
 * On Android the hardware back button therefore used to navigate the page (or
 * exit the app) instead of closing whatever overlay was open. Every overlay
 * registers a close callback here while it is open; the Capacitor back handler
 * (components/CapacitorBackHandler.tsx) pops the top one before falling back to
 * history/exit. LIFO order matches what the user expects: a lightbox opened on
 * top of a detail panel closes first, then the panel, then the page navigates.
 */

type CloseFn = () => void;
const stack: { id: number; close: CloseFn }[] = [];
let seq = 0;

function pushOverlay(close: CloseFn): () => void {
  const id = ++seq;
  stack.push({ id, close });
  return () => {
    const i = stack.findIndex(o => o.id === id);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** Closes the top-most overlay. Returns true if one was closed. */
export function popOverlay(): boolean {
  const top = stack.pop();
  if (!top) return false;
  try { top.close(); } catch { /* a close handler must never break back */ }
  return true;
}

export function hasOverlay(): boolean {
  return stack.length > 0;
}

/**
 * Registers `onClose` on the back-stack while `isOpen` is true. Call it from any
 * overlay so the hardware back button closes it instead of leaving the screen.
 * `onClose` may change every render; the latest is always used.
 */
export function useOverlayBack(isOpen: boolean, onClose: () => void): void {
  const cb = useRef(onClose);
  cb.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const remove = pushOverlay(() => cb.current());
    return remove;
  }, [isOpen]);
}
