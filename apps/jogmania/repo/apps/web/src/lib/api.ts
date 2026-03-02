import { createApiClient } from "@jogmania/api-client";

const TOKEN_KEY = "jogmania_token";

export const authStore = {
  getToken: () => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  setToken: (token: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken: () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TOKEN_KEY);
  }
};

export const api = createApiClient({
  getToken: authStore.getToken
});
