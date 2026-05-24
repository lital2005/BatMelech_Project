import { request } from "./apiClient";

function userHeaders(userId) {
  return userId ? { "X-User-Id": userId } : undefined;
}

export const notificationService = {
  list: (userId) =>
    request("/notifications", { headers: userHeaders(userId) }),

  unreadCount: (userId) =>
    request("/notifications/unread-count", { headers: userHeaders(userId) }),

  markRead: (id, userId) =>
    request(`/notifications/${encodeURIComponent(id)}/read`, {
      method: "POST",
      headers: userHeaders(userId),
    }),

  markAllRead: (userId) =>
    request("/notifications/read-all", {
      method: "POST",
      headers: userHeaders(userId),
    }),
};
