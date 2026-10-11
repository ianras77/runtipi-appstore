import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ModelMessage } from "ai";
import { request } from "undici";
import type { Env } from "./env.js";
import { getRassyMindConfig } from "./env.js";
import { createHouseAgent } from "./mastra/index.js";
import { normalizeHouseContext } from "./mastra/policy.js";
import { loadThreadMemory, saveThreadMemory } from "./mastra/memory.js";
import { runHouseBriefWorkflow } from "./mastra/workflows/house-brief.js";
import fs from "node:fs/promises";
import path from "node:path";

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string().max(20000) })).min(1).max(24),
  files: z.array(z.object({ name: z.string().max(160), size: z.number().int().nonnegative().max(200_000), type: z.string().max(120).optional(), content: z.string().max(20_000).optional() })).max(4).optional(),
  threadId: z.string().optional(),
  sessionId: z.string().optional(),
  mode: z.string().optional(),
  webSearchPolicy: z.enum(["auto", "on", "off"]).optional(),
  locale: z.string().max(32).optional(),
  accessLevel: z.enum(["anonymous", "family"]).optional(),
  source: z.enum(["web", "capacitor"]).optional(),
});
const FeedbackBody = z.object({ runId: z.string().max(120), threadId: z.string().max(120), mode: z.string().max(40), rating: z.enum(["up", "down"]) });

function modeInstructions(mode: string, webSearchPolicy: string) {
  const modeText = {
    auto: "Choose the smallest useful approach.", checklist: "Answer as a calm, practical checklist.", explain: "Explain simply for a nontechnical family member.", plan: "Make a bounded plan with clear next steps.", write: "Write the requested family message directly.", compare: "Compare options with concise tradeoffs.", research: "Use web search for current evidence and cite returned sources.", "home-lab": "Explain home services without suggesting infrastructure mutations.",
  }[mode] ?? "Choose the smallest useful approach.";
  return `${modeText} Web search policy is ${webSearchPolicy}; obey it and prefer local Rasies tools first.`;
}

function houseDirectoryInstructions(env: Env) {
  return `Authoritative Rasies links for orientation (use these exact links when relevant): media signup ${env.SIGNUP_URL}; family account request ${env.AUTHENTIK_URL}if/flow/runtipi-waitlist-enrollment/; existing family sign-in and app library ${env.HEIMDALL_URL}; search ${env.SEARXNG_BASE_URL}; photos ${env.PHOTOS_URL}; large files ${env.SEND_URL}; Plex ${env.PLEX_URL}. Media signup and family-account sign-in are different paths. If the signup service tool is unavailable or returns an empty list, still explain these paths and say that live media availability could not be confirmed. Never ask an anonymous visitor to identify themselves before explaining these public paths.`;
}

const HOUSE_SPOTLIGHT = {
  mood: "The house is open, the lights are on, and House Chat is ready to help.",
  mission: "Pick one useful thing that would make today easier.",
  surprise: "A small, calm plan often beats a heroic one.",
  prompts: ["Plan today", "Find something in the family archive", "Write a family note", "Check the house"],
};

export async function registerHouseRoutes(app: FastifyInstance, env: Env) {
  let agent: ReturnType<typeof createHouseAgent> | undefined;
  const windows = new Map<string, { startedAt: number; count: number }>();
  const getAgent = () => (agent ??= createHouseAgent(env));

  const allow = (key: string) => {
    const now = Date.now();
    const current = windows.get(key);
    if (!current || now - current.startedAt >= 60_000) {
      windows.set(key, { startedAt: now, count: 1 });
      return true;
    }
    if (current.count >= 30) return false;
    current.count += 1;
    return true;
  };

  app.post("/api/house/chat", async (request, reply) => {
    const parsed = Body.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid House Chat request" });
    const rateKey = typeof request.headers["x-forwarded-for"] === "string" ? request.headers["x-forwarded-for"].split(",")[0].trim() : request.ip;
    if (!allow(rateKey)) return reply.code(429).header("retry-after", "60").send({ error: "House Chat rate limit reached" });
    const context = normalizeHouseContext(parsed.data);
    try {
      const messages = [...await loadThreadMemory(env.MASTRA_DATA_DIR ?? "/data/mastra", context.threadId), ...parsed.data.messages] as ModelMessage[];
      const result = await getAgent().generate(messages, { maxSteps: 5, instructions: `${modeInstructions(context.mode, context.webSearchPolicy)} ${houseDirectoryInstructions(env)} Session: ${context.sessionId}. Access level: ${context.accessLevel}. Locale: ${context.locale}. Use the signup tools and house directory for live account help; never invent links.` });
      await saveThreadMemory(env.MASTRA_DATA_DIR ?? "/data/mastra", context.threadId, [...messages, { role: "assistant", content: result.text } as ModelMessage]);
      return { runId: crypto.randomUUID(), threadId: context.threadId, text: result.text, sources: [] };
    } catch (error) {
      request.log.warn({ err: error }, "House Chat unavailable");
      return reply.code(503).send({ error: "House Chat unavailable", threadId: context.threadId });
    }
  });

  app.post("/api/house/chat/stream", async (request, reply) => {
    const parsed = Body.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid House Chat request" });
    const rateKey = typeof request.headers["x-forwarded-for"] === "string" ? request.headers["x-forwarded-for"].split(",")[0].trim() : request.ip;
    if (!allow(rateKey)) return reply.code(429).send({ error: "House Chat rate limit reached" });
    const context = normalizeHouseContext(parsed.data);
    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    });
    const send = (event: string, data: unknown) => reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    try {
      const runId = crypto.randomUUID();
      send("message_start", { runId, threadId: context.threadId });
      const messages = [...await loadThreadMemory(env.MASTRA_DATA_DIR ?? "/data/mastra", context.threadId), ...parsed.data.messages] as ModelMessage[];
      const result = await getAgent().stream(messages, { maxSteps: 5, instructions: `${modeInstructions(context.mode, context.webSearchPolicy)} ${houseDirectoryInstructions(env)} Session: ${context.sessionId}. Access level: ${context.accessLevel}. Locale: ${context.locale}. Use the signup tools and house directory for live account help; never invent links.` });
      let fullText = "";
      for await (const delta of result.textStream) { fullText += delta; send("text_delta", { text: delta }); }
      await saveThreadMemory(env.MASTRA_DATA_DIR ?? "/data/mastra", context.threadId, [...messages, { role: "assistant", content: fullText } as ModelMessage]);
      send("message_end", { runId, threadId: context.threadId });
    } catch (error) {
      request.log.warn({ err: error }, "House Chat stream unavailable");
      send("error", { error: "House Chat unavailable" });
    } finally {
      reply.raw.end();
    }
  });

  app.get("/api/house/health", async (_request, reply) => {
    try {
      getAgent();
      const config = getRassyMindConfig(env);
      const headers: Record<string, string> = {};
      if (config.apiKey.trim()) headers.authorization = `Bearer ${config.apiKey}`;
      const res = await request(new URL("/v1/models", config.baseUrl), {
        method: "GET",
        headers,
        headersTimeout: Math.min(config.timeoutMs, 5000),
        bodyTimeout: Math.min(config.timeoutMs, 5000),
      });
      res.body.resume();
      if (res.statusCode >= 400) throw new Error(`RassyMind status ${res.statusCode}`);
      return { ok: true, provider: "rassymind", model: config.model, upstreamStatus: res.statusCode };
    } catch {
      return reply.code(503).send({ ok: false, provider: "rassymind" });
    }
  });

  app.get("/api/house/spotlight", async () => {
    try { return { source: "house-brief", ...(await runHouseBriefWorkflow(env)) }; }
    catch { return { source: "fallback", ...HOUSE_SPOTLIGHT }; }
  });

  app.post("/api/house/feedback", async (request, reply) => {
    const parsed = FeedbackBody.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid feedback" });
    try {
      const root = env.MASTRA_DATA_DIR ?? "/data/mastra";
      await fs.mkdir(root, { recursive: true });
      await fs.appendFile(path.join(root, "feedback.jsonl"), `${JSON.stringify({ ...parsed.data, createdAt: new Date().toISOString() })}\n`, { mode: 0o600 });
    } catch { /* feedback must never affect the chat path */ }
    return { ok: true };
  });
}
