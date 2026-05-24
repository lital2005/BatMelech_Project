import { request } from "./apiClient";

function userHeaders(userId) {
  return userId ? { "X-User-Id": userId } : undefined;
}

export const managerService = {
  listPendingLecturers: (managerId) =>
    request("/manager/lecturers/pending", { headers: userHeaders(managerId) }),

  approveLecturer: (id, managerId) =>
    request(`/manager/lecturers/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      headers: userHeaders(managerId),
    }),

  rejectLecturer: (id, managerId) =>
    request(`/manager/lecturers/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      headers: userHeaders(managerId),
    }),

  listPendingSeminaries: (managerId) =>
    request("/manager/seminaries/pending", { headers: userHeaders(managerId) }),

  approveSeminary: (id, managerId) =>
    request(`/manager/seminaries/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      headers: userHeaders(managerId),
    }),

  rejectSeminary: (id, managerId, note) =>
    request(`/manager/seminaries/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      body: note ? { note } : {},
      headers: userHeaders(managerId),
    }),
};
