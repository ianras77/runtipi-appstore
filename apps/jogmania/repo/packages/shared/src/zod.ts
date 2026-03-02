import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const runSchema = z.object({
  started_at: z.string(),
  duration_seconds: z.number().int().positive(),
  avg_pace: z.number().positive()
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RunInput = z.infer<typeof runSchema>;
