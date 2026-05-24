import { request } from "./apiClient";

function userHeaders(userId) {
  return userId ? { "X-User-Id": userId } : undefined;
}

export const enrollmentService = {
  requestJoin: (seminaryId, userId, message) =>
    request("/enrollment/request", {
      method: "POST",
      body: { seminaryId, message },
      headers: userHeaders(userId),
    }),

  myRequests: (userId) =>
    request("/enrollment/my", {
      headers: userHeaders(userId),
    }),

  listForLecturer: (userId, { status } = {}) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    return request(`/enrollment/lecturer${qs}`, {
      headers: userHeaders(userId),
    });
  },

  sendInitialApproval: (requestId, userId) =>
    request(`/enrollment/${encodeURIComponent(requestId)}/initial-approval`, {
      method: "POST",
      headers: userHeaders(userId),
    }),
};
