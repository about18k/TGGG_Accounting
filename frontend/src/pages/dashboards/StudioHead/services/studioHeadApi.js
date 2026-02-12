import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
});

export async function getPendingUsers() {
  // Example: GET /api/users/pending
  const res = await api.get('/api/users/pending');
  return res.data;
}

export async function approvePendingUser({ userId, role }) {
  // Example: POST /api/users/:id/approve
  const res = await api.post(`/api/users/${userId}/approve`, { role });
  return res.data;
}

export async function getAllUsers() {
  // Example: GET /api/users
  const res = await api.get('/api/users');
  return res.data;
}
