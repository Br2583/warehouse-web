const KEY = 'wm_chat_last_seen';

export function getChatLastSeen(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(KEY) || '0', 10);
}

export function markChatSeen(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, String(Date.now()));
}
