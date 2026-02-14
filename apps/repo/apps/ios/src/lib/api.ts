import { createApiClient } from "@jogmania/api-client";
import { API_BASE_URL } from "@jogmania/shared";

let token: string | null = null;

export const setToken = (nextToken: string | null) => {
  token = nextToken;
};

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => token
});
