import { createResourceService, request } from './apiClient';

const resource = createResourceService('questions');

export const questionsAnswersService = {
  ...resource,
  create: (body, userId) =>
    request('/questions', {
      method: 'POST',
      body,
      headers: userId ? { 'X-User-Id': userId } : undefined,
    }),
  listAnsweredPublic: (limit = 24) =>
    request(`/questions/public/answered?limit=${encodeURIComponent(limit)}`),
  myThreads: (userId) =>
    request('/questions/student/my-threads', {
      headers: userId ? { 'X-User-Id': userId } : undefined,
    }),
  inboxUnanswered: (userId) =>
    request('/questions/inbox/unanswered', {
      headers: userId ? { 'X-User-Id': userId } : undefined,
    }),
  lecturerStudentChats: (userId) =>
    request('/questions/lecturer/student-chats', {
      headers: userId ? { 'X-User-Id': userId } : undefined,
    }),
  lecturerStudentMessages: (studentId, userId) =>
    request(`/questions/lecturer/student/${encodeURIComponent(studentId)}/messages`, {
      headers: userId ? { 'X-User-Id': userId } : undefined,
    }),
  getMessages: (threadId, userId) =>
    request(`/questions/thread/${encodeURIComponent(threadId)}/messages`, {
      headers: userId ? { 'X-User-Id': userId } : undefined,
    }),
  postMessage: (threadId, content, userId) =>
    request(`/questions/thread/${encodeURIComponent(threadId)}/messages`, {
      method: 'POST',
      body: { content },
      headers: userId ? { 'X-User-Id': userId } : undefined,
    }),
  publishThreadMessage: (threadId, messageId, kind, userId) =>
    request(
      `/questions/thread/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}/publish-public`,
      {
        method: 'POST',
        body: { kind },
        headers: userId ? { 'X-User-Id': userId } : undefined,
      }
    ),
  deleteMessage: (threadId, messageId, userId) =>
    request(
      `/questions/thread/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}`,
      {
        method: 'DELETE',
        headers: userId ? { 'X-User-Id': userId } : undefined,
      }
    ),
  unpublishPublic: (threadId, kind, userId) =>
    request(`/questions/thread/${encodeURIComponent(threadId)}/publish-public`, {
      method: 'DELETE',
      body: { kind },
      headers: userId ? { 'X-User-Id': userId } : undefined,
    }),
};
