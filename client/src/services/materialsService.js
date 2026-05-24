import { request } from "./apiClient";

export const materialsService = {
  list: () => request("/materials"),
  uploadForSeminary: ({ seminaryId, topicCode, content, files }, userId) => {
    const fd = new FormData();
    fd.append("topicCode", topicCode);
    fd.append("content", content);
    for (const f of files ?? []) fd.append("files", f);
    return request(`/materials/seminary/${encodeURIComponent(seminaryId)}/upload`, {
      method: "POST",
      body: fd,
      headers: userId ? { "X-User-Id": userId } : undefined,
    });
  },
  remove: (id, userId) =>
    request(`/materials/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: userId ? { "X-User-Id": userId } : undefined,
    }),
};
