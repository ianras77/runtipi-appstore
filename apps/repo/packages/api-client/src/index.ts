import { API_BASE_URL } from "@jogmania/shared";
import type {
  ExportResponse,
  LoginRequest,
  NarrateRequest,
  NarrateResponse,
  QuestRequest,
  QuestResponse,
  RegisterRequest,
  Run,
  RunCreate,
  TokenResponse,
  User
} from "@jogmania/shared";

export type ApiClientOptions = {
  baseUrl?: string;
  getToken?: () => string | null | undefined;
};

const jsonHeaders = {
  "Content-Type": "application/json"
};

async function request<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
  getToken?: () => string | null | undefined
): Promise<T> {
  const token = getToken?.();
  const headers = {
    ...jsonHeaders,
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
}

export const createApiClient = (options: ApiClientOptions = {}) => {
  const baseUrl = options.baseUrl || API_BASE_URL;
  const getToken = options.getToken;

  return {
    register: (payload: RegisterRequest) =>
      request<User>(baseUrl, "/auth/register", {
        method: "POST",
        body: JSON.stringify(payload)
      }),

    login: (payload: LoginRequest) =>
      request<TokenResponse>(baseUrl, "/auth/login", {
        method: "POST",
        body: JSON.stringify(payload)
      }),

    me: () => request<User>(baseUrl, "/me", {}, getToken),

    createRun: (payload: RunCreate) =>
      request<Run>(
        baseUrl,
        "/runs",
        {
          method: "POST",
          body: JSON.stringify(payload)
        },
        getToken
      ),

    listRuns: () => request<Run[]>(baseUrl, "/runs", {}, getToken),

    aiQuest: (payload: QuestRequest) =>
      request<QuestResponse>(
        baseUrl,
        "/ai/quest",
        {
          method: "POST",
          body: JSON.stringify(payload)
        },
        getToken
      ),

    aiNarrate: (payload: NarrateRequest) =>
      request<NarrateResponse>(
        baseUrl,
        "/ai/narrate",
        {
          method: "POST",
          body: JSON.stringify(payload)
        },
        getToken
      ),

    exportRun: (runId: number) =>
      request<ExportResponse>(
        baseUrl,
        `/exports/run/${runId}`,
        {
          method: "POST"
        },
        getToken
      )
  };
};
