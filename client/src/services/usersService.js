import { createResourceService, request } from './apiClient';

const resource = createResourceService('users');

export const usersService = {
  ...resource,
  listLecturersForChat: () => request('/users/public/lecturers'),
  uploadProfileImage: (id, file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return request(`/users/${encodeURIComponent(id)}/profile-image`, {
      method: 'POST',
      body: fd,
    });
  },
};
