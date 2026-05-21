const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const createRfq = (body) => request('/rfq/create', { method: 'POST', body: JSON.stringify(body) });
export const listRfqs = () => request('/rfq');
export const getRfq = (id) => request(`/rfq/${id}`);
export const submitBid = (id, body) => request(`/rfq/${id}/bid`, { method: 'POST', body: JSON.stringify(body) });
export const getBids = (id) => request(`/rfq/${id}/bids`);
export const getEvents = (id) => request(`/rfq/${id}/events`);
export const getDashboardInsights = () => request('/insights/dashboard');
export const simulateBid = (id, body) => request(`/insights/rfq/${id}/simulate`, { method: 'POST', body: JSON.stringify(body) });
