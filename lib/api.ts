export const BACKEND_URL = 'https://storagemap-3.emergent.host';

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('session_token');
};

export const setToken = (token: string) => {
  localStorage.setItem('session_token', token);
};

export const removeToken = () => {
  localStorage.removeItem('session_token');
  localStorage.removeItem('pin_verified');
};

export const api = {
  get: async (path: string) => {
    const token = getToken();
    const res = await fetch(`${BACKEND_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      removeToken();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('401');
    }
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  },

  post: async (path: string, body: any) => {
    const token = getToken();
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let detail = `${res.status}`;
      try { const d = await res.json(); detail = JSON.stringify(d.detail || d); } catch {}
      throw new Error(detail);
    }
    return res.json();
  },

  put: async (path: string, body: any) => {
    const token = getToken();
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let detail = `${res.status}`;
      try { const d = await res.json(); detail = JSON.stringify(d.detail || d); } catch {}
      throw new Error(detail);
    }
    return res.json();
  },

  delete: async (path: string) => {
    const token = getToken();
    const res = await fetch(`${BACKEND_URL}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`${res.status}`);
    if (res.status === 204 || res.headers.get('content-length') === '0') return null;
    return res.json();
  },
};
