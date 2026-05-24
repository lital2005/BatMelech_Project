import { request } from "./apiClient";

export const authService = {
  login: ({ email, password }) =>
    request("/users/login", { method: "POST", body: { email, password } }),

  forgotPassword: (email) =>
    request("/users/forgot-password", { method: "POST", body: { email } }),

  resetPassword: ({ token, password }) =>
    request("/users/reset-password", { method: "POST", body: { token, password } }),
};

