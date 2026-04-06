const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  health: () => request('/api/health'),
  saveProfile: (profile) =>
    request('/api/user/profile', { method: 'POST', body: JSON.stringify(profile) }),
  getMe: (uid) =>
    request('/api/user/me', { method: 'POST', body: JSON.stringify({ uid }) }),
};
