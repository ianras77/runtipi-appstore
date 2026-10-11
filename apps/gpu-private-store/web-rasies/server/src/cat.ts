import { FastifyInstance } from "fastify";
import { request } from "undici";
import { z } from "zod";
import { Env, getRassyMindConfig } from "./env.js";
import { extractLlmText } from "./llmText.js";

const ChatAttachmentSchema = z.object({
  name: z.string(),
  size: z.number().nonnegative(),
  type: z.string().optional(),
  content: z.string().optional(),
});

const ChatBodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    }),
  ),
  userId: z.string().optional(),
  file: ChatAttachmentSchema.optional(),
  files: z.array(ChatAttachmentSchema).max(4).optional(),
});

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isTimeoutError(err: unknown) {
  if (err instanceof Error) {
    return /timeout/i.test(err.message);
  }
  if (!err || typeof err !== "object") return false;
  const record = err as Record<string, unknown>;
  return typeof record.message === "string" && /timeout/i.test(record.message);
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Unknown error";
}

function chatFilesFromBody(body: z.infer<typeof ChatBodySchema>) {
  const files = body.files?.length ? body.files : body.file ? [body.file] : [];
  return files.slice(0, 4);
}

function buildFileNote(files: ReturnType<typeof chatFilesFromBody>) {
  if (files.length === 0) return "";

  return files
    .map((file, index) => {
      const label =
        files.length > 1 ? `Attachment ${index + 1}:` : "Attachment:";
      const type = file.type?.trim() || "unknown";
      const preview = file.content?.slice(0, 8000) ?? "(no preview)";
      return `\n\n[${label} ${file.name} (${type}, ${file.size} bytes)]\n${preview}`;
    })
    .join("");
}

function jsonHeaders(env: Env) {
  const config = getRassyMindConfig(env);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
  };
  const apiKey = config.apiKey.trim();
  if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

function acceptHeaders(env: Env) {
  const config = getRassyMindConfig(env);
  const headers: Record<string, string> = { accept: "application/json" };
  const apiKey = config.apiKey.trim();
  if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

function toHttpMethod(value: string) {
  return value as HttpMethod;
}

type SpotlightPayload = {
  mood: string;
  mission: string;
  surprise: string;
  prompts: string[];
};

const DEFAULT_SPOTLIGHT: SpotlightPayload = {
  mood: "The house is open, the lights are on, and House Chat is ready to help.",
  mission:
    "Pick one thing that would make today easier and let House Chat help you do it cleanly.",
  surprise:
    "Try one useful question, one fun question, or one small self-hosting idea you have been meaning to chase.",
  prompts: [
    "Help me plan the rest of today without overcomplicating it.",
    "Tell me one surprising thing worth sharing at dinner.",
    "Draft a short note I can send to the family tonight.",
    "Give me one small idea that would make this site feel even more like ours.",
  ],
};

const SPOTLIGHT_TTL_MS = 1000 * 60 * 60 * 4;
let spotlightCache: { expiresAt: number; payload: SpotlightPayload } | null =
  null;

function normalizePrompts(input: unknown) {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0 && item.length <= 140),
    ),
  ).slice(0, 6);
}

function normalizeSpotlight(input: unknown): SpotlightPayload | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as Partial<SpotlightPayload>;
  const mood = typeof candidate.mood === "string" ? candidate.mood.trim() : "";
  const mission =
    typeof candidate.mission === "string" ? candidate.mission.trim() : "";
  const surprise =
    typeof candidate.surprise === "string" ? candidate.surprise.trim() : "";
  const prompts = normalizePrompts(candidate.prompts);

  if (!mood || !mission || !surprise || prompts.length < 2) return null;
  return {
    mood,
    mission,
    surprise,
    prompts,
  };
}

export async function registerCatRoutes(app: FastifyInstance, env: Env) {
  app.get("/api/cat/spotlight", async (req, reply) => {
    const now = Date.now();
    if (spotlightCache && spotlightCache.expiresAt > now) {
      return { source: "cache", ...spotlightCache.payload };
    }

    try {
      const config = getRassyMindConfig(env);
      const endpoint = new URL(config.chatPath, config.baseUrl).toString();
      const isCheshire = config.chatPath.includes("/message");
      const prompt =
        "Return ONLY valid JSON with keys mood, mission, surprise, prompts. prompts must be an array of exactly 4 short prompt strings. Make the set feel warm, curious, and family-friendly for a self-hosted family site: include one practical life prompt, one fun prompt, one family note prompt, and one small self-hosting idea.";

      const payload = isCheshire
        ? { text: prompt, user_id: "spotlight" }
        : {
            model: config.model,
            stream: false,
            messages: [
              {
                role: "system",
                content:
                  "You produce concise spotlight content for a warm family self-hosted site. Output strict JSON only, no markdown.",
              },
              { role: "user", content: prompt },
            ],
          };

      const res = await request(endpoint, {
        method: "POST",
        headers: jsonHeaders(env),
        body: JSON.stringify(payload),
        headersTimeout: config.timeoutMs,
        bodyTimeout: config.timeoutMs,
      });

      const text = await res.body.text();
      const data = safeJsonParse(text);
      const raw = extractLlmText(data) ?? text;

      const parsed =
        typeof raw === "string"
          ? (safeJsonParse(raw) ??
            (() => {
              const matched = raw.match(/\{[\s\S]*\}/);
              return matched ? safeJsonParse(matched[0]) : null;
            })())
          : raw;

      const normalized = normalizeSpotlight(parsed) ?? DEFAULT_SPOTLIGHT;
      spotlightCache = {
        payload: normalized,
        expiresAt: now + SPOTLIGHT_TTL_MS,
      };

      return {
        source: normalizeSpotlight(parsed) ? "cheshire-cat" : "fallback",
        ...normalized,
      };
    } catch (err: unknown) {
      req.log.warn({ err }, "spotlight generation failed");
      reply.header("x-spotlight-fallback", "true");
      spotlightCache = {
        payload: DEFAULT_SPOTLIGHT,
        expiresAt: now + 1000 * 60 * 10,
      };
      return {
        source: "fallback",
        ...DEFAULT_SPOTLIGHT,
      };
    }
  });

  app.post("/api/cat/chat", async (req, reply) => {
    const parsed = ChatBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "Invalid body", details: parsed.error.flatten() });
    }

    try {
      const config = getRassyMindConfig(env);
      const target = new URL(config.chatPath, config.baseUrl).toString();
      const isCheshire = config.chatPath.includes("/message");

      const lastUserMessage = [...parsed.data.messages]
        .reverse()
        .find((message) => message.role === "user");
      const userId =
        parsed.data.userId ??
        (typeof req.headers["x-forwarded-for"] === "string"
          ? req.headers["x-forwarded-for"].split(",")[0].trim()
          : undefined) ??
        req.ip ??
        "user";

      const fileNote = buildFileNote(chatFilesFromBody(parsed.data));

      const payload = isCheshire
        ? {
            text: `${lastUserMessage?.content ?? ""}${fileNote}`.trim(),
            user_id: userId,
          }
        : {
            model: config.model,
            messages: fileNote
              ? [...parsed.data.messages, { role: "user", content: fileNote }]
              : parsed.data.messages,
            stream: false,
          };

      let res: Awaited<ReturnType<typeof request>> | null = null;
      let text = "";
      const timeoutMs = config.timeoutMs;
      const retryTimeoutMs = Math.max(timeoutMs, 90000);

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          res = await request(target, {
            method: "POST",
            headers: jsonHeaders(env),
            body: JSON.stringify(payload),
            headersTimeout: attempt === 1 ? timeoutMs : retryTimeoutMs,
            bodyTimeout: attempt === 1 ? timeoutMs : retryTimeoutMs,
          });
          text = await res.body.text();
          break;
        } catch (err) {
          if (attempt === 1 && isTimeoutError(err)) {
            req.log.warn({ err }, "cat upstream timeout; retrying once");
            continue;
          }
          throw err;
        }
      }

      if (!res) {
        throw new Error("Cat upstream failed before response");
      }
      reply.code(res.statusCode);

      const data = safeJsonParse(text);
      const replyText =
        extractLlmText(data) ??
        (typeof text === "string" && text.trim().length > 0 ? text : "");

      if (res.statusCode >= 400) {
        return reply.code(res.statusCode).send({
          error: "Cat upstream error",
          detail: replyText || `HTTP ${res.statusCode}`,
        });
      }

      if (!replyText.trim()) {
        req.log.warn(
          { target, statusCode: res.statusCode },
          "cat upstream returned an empty reply",
        );
        return reply.code(502).send({
          error: "Cat upstream returned an empty reply",
          detail: "The assistant service responded without usable text.",
        });
      }

      return { reply: replyText.trim() };
    } catch (err: unknown) {
      req.log.error({ err }, "cat upstream failed");
      return reply
        .code(502)
        .send({ error: "Cat proxy failed", detail: errorMessage(err) });
    }
  });

  app.get("/api/cat/health", async (req, reply) => {
    const config = getRassyMindConfig(env);
    const isCheshire = config.chatPath.includes("/message");
    const target = isCheshire
      ? new URL("/", config.baseUrl).toString()
      : new URL("/v1/models", config.baseUrl).toString();
    const started = Date.now();

    try {
      const res = await request(target, {
        method: "GET",
        headers: acceptHeaders(env),
        headersTimeout: config.timeoutMs,
        bodyTimeout: config.timeoutMs,
      });

      const latencyMs = Date.now() - started;
      return {
        ok: res.statusCode < 500,
        target,
        upstreamStatus: res.statusCode,
        latencyMs,
      };
    } catch (err: unknown) {
      req.log.error({ err }, "cat health check failed");
      return reply.code(502).send({
        ok: false,
        error: "Cat health check failed",
        detail: errorMessage(err),
        target,
      });
    }
  });

  // pass-through: /api/cat/* -> CAT_BASE_URL/*
  app.all("/api/cat/*", async (req, reply) => {
    const suffix = (req.url ?? "").replace(/^\/api\/cat/, "");
    const config = getRassyMindConfig(env);
    const target = new URL(suffix, config.baseUrl).toString();

    const method = toHttpMethod(req.method);

    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : typeof req.body === "string"
        ? req.body
        : req.body
          ? JSON.stringify(req.body)
          : undefined;

    const headers = { ...(req.headers as Record<string, string>) };
    delete headers.host;
    delete headers["content-length"];

    const res = await request(target, {
      method,
      headers,
      body: rawBody,
      headersTimeout: config.timeoutMs,
      bodyTimeout: config.timeoutMs,
    });

    reply.code(res.statusCode);
    for (const [key, value] of Object.entries(res.headers)) {
      if (!value) continue;
      if (
        ["transfer-encoding", "connection", "keep-alive"].includes(
          key.toLowerCase(),
        )
      )
        continue;
      reply.header(key, Array.isArray(value) ? value : String(value));
    }

    const buf = await res.body.arrayBuffer();
    return Buffer.from(buf);
  });
}
