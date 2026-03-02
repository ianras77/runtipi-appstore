export type User = {
  id: number;
  email: string;
  created_at: string;
};

export type Run = {
  id: number;
  user_id: number;
  started_at: string;
  duration_seconds: number;
  avg_pace: number;
  created_at: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type RunCreate = {
  started_at: string;
  duration_seconds: number;
  avg_pace: number;
};

export type QuestRequest = {
  prompt: string;
};

export type QuestResponse = {
  quest_text: string;
  metadata: Record<string, string | number | boolean>;
};

export type NarrateRequest = {
  context: string;
};

export type NarrateResponse = {
  narration_text: string;
};

export type ExportResponse = {
  status: "ok";
  object_key: string;
};
