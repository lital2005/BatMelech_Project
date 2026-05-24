import { request } from "./apiClient";

export const galleryService = {
  list: () => request("/gallery"),
  uploadForSeminary: ({ seminaryId, file, description }, userId) => {
    const fd = new FormData();
    fd.append("file", file);
    if (description) fd.append("description", description);
    return request(`/gallery/seminary/${encodeURIComponent(seminaryId)}/upload`, {
      method: "POST",
      body: fd,
      headers: userId ? { "X-User-Id": userId } : undefined,
    });
  },
  remove: (id, userId) =>
    request(`/gallery/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: userId ? { "X-User-Id": userId } : undefined,
    }),
};
