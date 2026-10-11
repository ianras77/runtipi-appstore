import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3000),

  PUBLIC_BASE_URL: z.string().default("https://www.rasies.com"),
  PUBLIC_PROBE_URL: z.string().optional(),
  PERSONAL_SITE_URL: z.string().default("https://rassys.com"),

  MC_TROUP_SERVER_HOST: z.string().default("crafty.rasies.com:25565"),
  MC_TROUP_BLUEMAP_URL: z
    .string()
    .default("https://crafty.rasies.com/mc-troup-map"),
  MC_TROUP_BLUEMAP_PROXY_PATH: z.string().default("/mc-troup-map"),

  SEARXNG_BASE_URL: z.string().default("https://search.rasies.com"),
  SEARXNG_PATH: z.string().default("/search"),
  SEARXNG_TIMEOUT_MS: z.coerce.number().default(9000),

  RASSYMIND_BASE_URL: z.string().optional(),
  RASSYMIND_CHAT_PATH: z.string().optional(),
  RASSYMIND_TIMEOUT_MS: z.coerce.number().optional(),
  RASSYMIND_MODEL: z.string().optional(),
  RASSYMIND_API_KEY: z.string().optional(),
  MASTRA_DATA_DIR: z.string().optional(),

  // Deprecated compatibility names. Existing deployed env files may still use these.
  CAT_BASE_URL: z.string().default("http://host.docker.internal:8844"),
  CAT_PUBLIC_URL: z.string().optional(),
  CAT_CHAT_PATH: z.string().default("/v1/chat/completions"),
  CAT_TIMEOUT_MS: z.coerce.number().default(60000),
  CAT_MODEL: z.string().default("rassy-fast"),
  CAT_API_KEY: z.string().default(""),

  STATUS_TIMEOUT_MS: z.coerce.number().default(4000),

  ALLOWED_ORIGINS: z
    .string()
    .default(
      "https://www.rasies.com,https://rassys.com,https://www.rassys.com,http://localhost:5173,http://127.0.0.1:5173",
    ),

  HEIMDALL_URL: z.string().default("https://apps.rasies.com"),
  GLANCE_URL: z.string().default("https://glance.rasies.com"),
  GAMES_URL: z.string().default("https://gba.rasies.com"),
  AUTHENTIK_URL: z.string().default("https://auth.rasies.com/"),
  SIGNUP_URL: z.string().default("https://signup.rasies.com"),
  PLEX_URL: z.string().default("https://plex.rasies.com"),
  WIZARR_BASE_URL: z.string().default("https://signup.rasies.com"),
  WIZARR_API_KEY: z.string().default(""),
  WIZARR_PLEX_SERVER_IDS: z.string().default(""),
  WIZARR_INVITE_EXPIRES_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(365)
    .default(30),
  WIZARR_INVITE_DURATION: z.string().default("unlimited"),
  WIZARR_TIMEOUT_MS: z.coerce.number().default(10000),
  DATA_URL: z.string().default("https://data.rasies.com"),
  PHOTOS_URL: z.string().default("https://photos.rasies.com"),
  SEND_URL: z.string().default("https://send.rasies.com"),
  GRIST_URL: z.string().default("https://grist.rasies.com"),
  DRAW_URL: z.string().default("https://draw.rasies.com"),
  AFFINE_URL: z.string().default("https://affine.rasies.com"),
  BEDTIME_STORIES_ROOT: z.string().default("/stories"),
  BEDTIME_STORIES_SHOW_TITLE: z.string().default("Real Life Bedtime Stories"),
  BEDTIME_STORIES_SHOW_SUBTITLE: z
    .string()
    .default("Books I recorded for my daughter, one cozy chapter at a time."),
  BEDTIME_STORIES_SHOW_DESCRIPTION: z
    .string()
    .default(
      "A family podcast shelf of bedtime stories read by Rassy, with each book arranged as its own cozy season.",
    ),
  BEDTIME_STORIES_SHOW_AUTHOR: z.string().default("Rassy"),
  BEDTIME_STORIES_SHOW_LANGUAGE: z.string().default("en-US"),
  BEDTIME_STORIES_OWNER_NAME: z.string().default("Rassy"),
  BEDTIME_STORIES_OWNER_EMAIL: z.string().default(""),
  BEDTIME_STORIES_AMAZON_TAG: z.string().default(""),
  THOUGHTS_ROOT: z.string().default("/thoughts"),
  MR_RASSY_SOUNDS_ROOT: z.string().default("/mr-rassy-sounds"),
  MUSIC_LIBRARY_ROOT: z.string().default("/music-library"),
  ABOUT_NAME: z.string().default("Rassy"),
  ABOUT_TAGLINE: z
    .string()
    .default(
      "Husband, dad, gardener, and the one happily keeping the family cloud humming.",
    ),
  ABOUT_BIO: z
    .string()
    .default(
      "A family home base for the useful things, the memory things, and the playful things we want close by. It should feel familiar, private, and unmistakably ours.",
    ),
  ABOUT_HIGHLIGHTS: z
    .string()
    .default(
      "For the Rasies,Family memories first,Self-hosted with care,Gardener energy",
    ),
});

export type Env = z.infer<typeof EnvSchema>;

export function getRassyMindConfig(env: Env) {
  return {
    baseUrl: env.RASSYMIND_BASE_URL ?? env.CAT_BASE_URL,
    chatPath: env.RASSYMIND_CHAT_PATH ?? env.CAT_CHAT_PATH,
    timeoutMs: env.RASSYMIND_TIMEOUT_MS ?? env.CAT_TIMEOUT_MS,
    model: env.RASSYMIND_MODEL ?? env.CAT_MODEL,
    apiKey: env.RASSYMIND_API_KEY ?? env.CAT_API_KEY,
  };
}

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.format());
    process.exit(1);
  }
  return parsed.data;
}
