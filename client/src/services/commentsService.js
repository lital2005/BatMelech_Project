import { request } from './apiClient';

export const commentsService = {
  listBySeminary: (seminaryId) =>
    request(`/comments/seminary/${encodeURIComponent(seminaryId)}`),
  create: (body, userId) =>
    request('/comments', {
      method: 'POST',
      body,
      headers: userId ? { 'X-User-Id': userId } : undefined,
    }),
  remove: (id, userId) =>
    request(`/comments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: userId ? { 'X-User-Id': userId } : undefined,
    }),
};
