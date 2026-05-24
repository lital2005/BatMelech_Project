import { request } from './apiClient';

export const seminaryService = {
  list: () => request('/seminary'),
  create: (data, userId) =>
    request('/seminary', {
      method: 'POST',
      body: data,
      headers: userId ? { 'X-User-Id': userId } : undefined,
    }),
  update: (id, data, userId) =>
    request(`/seminary/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: data,
      headers: userId ? { 'X-User-Id': userId } : undefined,
    }),
  remove: (id, userId) =>
    request(`/seminary/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: userId ? { 'X-User-Id': userId } : undefined,
    }),
};

