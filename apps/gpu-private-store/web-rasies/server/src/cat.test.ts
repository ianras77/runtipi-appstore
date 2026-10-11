import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { request } from "undici";
import { createApp } from "./app.js";
import { loadEnv } from "./env.js";

vi.mock("undici", () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);
const instances: { close: () => Promise<void> }[] = [];
const tempDirs: string[] = [];

function createTempWebDist() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rasies-cat-web-dist-"));
  tempDirs.push(dir);
  fs.writeFileSync(
    path.join(dir, "index.html"),
    "<!doctype html><html><body>portal</body></html>",
  );
  return dir;
}

function makeEnv(overrides: Partial<ReturnType<typeof loadEnv>> = {}) {
  return {
    ...loadEnv(),
    CAT_BASE_URL: "http://cat.local",
    CAT_CHAT_PATH: "/message",
    CAT_MODEL: "test-model",
    CAT_TIMEOUT_MS: 1200,
    ...overrides,
  };
}

function mockLlmResponse(payload: unknown, statusCode = 200) {
  mockedRequest.mockResolvedValueOnce({
    statusCode,
    headers: {},
    body: {
      text: async () =>
        typeof payload === "string" ? payload : JSON.stringify(payload),
      arrayBuffer: async () => Buffer.from(JSON.stringify(payload)),
    },
  } as unknown as Awaited<ReturnType<typeof request>>);
}

afterEach(async () => {
  mockedRequest.mockReset();

  for (const app of instances.splice(0)) {
    await app.close();
  }

  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("cat routes", () => {
  it("uses the canonical authenticated RassyMind chat and health contract", async () => {
    mockLlmResponse({
      choices: [{ message: { content: "RassyMind is connected." } }],
    });

    const app = await createApp(
      makeEnv({
        CAT_BASE_URL: "http://legacy-cat.local",
        CAT_CHAT_PATH: "/legacy-chat",
        CAT_MODEL: "legacy-model",
        CAT_API_KEY: "legacy-key",
        RASSYMIND_BASE_URL: "http://rassymind.local:8844",
        RASSYMIND_CHAT_PATH: "/v1/chat/completions",
        RASSYMIND_MODEL: "rassy-fast",
        RASSYMIND_API_KEY: "rassymind-test-key",
        RASSYMIND_TIMEOUT_MS: 4321,
      } as Partial<ReturnType<typeof loadEnv>>),
      { webDistRoot: createTempWebDist() },
    );
    instances.push(app);

    const chat = await app.inject({
      method: "POST",
      url: "/api/cat/chat",
      payload: {
        messages: [{ role: "user", content: "Say the gateway is connected." }],
      },
    });

    expect(chat.statusCode).toBe(200);
    expect(chat.json()).toEqual({ reply: "RassyMind is connected." });
    expect(mockedRequest).toHaveBeenCalledWith(
      "http://rassymind.local:8844/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer rassymind-test-key",
        }),
        body: JSON.stringify({
          model: "rassy-fast",
          messages: [
            { role: "user", content: "Say the gateway is connected." },
          ],
          stream: false,
        }),
        headersTimeout: 4321,
        bodyTimeout: 4321,
      }),
    );

    mockLlmResponse("ok");
    const health = await app.inject({ method: "GET", url: "/api/cat/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({
      ok: true,
      target: "http://rassymind.local:8844/v1/models",
      upstreamStatus: 200,
    });
  });

  it("proxies Cheshire Cat chat messages and extracts the assistant reply", async () => {
    mockLlmResponse({ content: [{ text: "Family link is working." }] });

    const app = await createApp(makeEnv(), {
      webDistRoot: createTempWebDist(),
    });
    instances.push(app);

    const res = await app.inject({
      method: "POST",
      url: "/api/cat/chat",
      payload: {
        userId: "family-test",
        messages: [
          { role: "system", content: "Keep it warm." },
          { role: "user", content: "Check the family link." },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ reply: "Family link is working." });
    expect(mockedRequest).toHaveBeenCalledWith(
      "http://cat.local/message",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          text: "Check the family link.",
          user_id: "family-test",
        }),
      }),
    );
  });

  it("supports generic chat-completion endpoints when CAT_CHAT_PATH is not Cheshire Cat", async () => {
    mockLlmResponse({
      choices: [
        {
          message: {
            content: [{ text: "Generic model is connected." }],
          },
        },
      ],
    });

    const app = await createApp(makeEnv({ CAT_CHAT_PATH: "/api/chat" }), {
      webDistRoot: createTempWebDist(),
    });
    instances.push(app);

    const messages = [
      { role: "system", content: "You are House Chat." },
      { role: "user", content: "Say the model is connected." },
    ];

    const res = await app.inject({
      method: "POST",
      url: "/api/cat/chat",
      payload: { messages },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ reply: "Generic model is connected." });
    expect(mockedRequest).toHaveBeenCalledWith(
      "http://cat.local/api/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          model: "test-model",
          messages,
          stream: false,
        }),
      }),
    );
  });

  it("passes multiple uploaded file notes to generic chat endpoints", async () => {
    mockLlmResponse({ reply: "I can see both notes." });

    const app = await createApp(makeEnv({ CAT_CHAT_PATH: "/api/chat" }), {
      webDistRoot: createTempWebDist(),
    });
    instances.push(app);

    const messages = [
      { role: "system", content: "You are House Chat." },
      { role: "user", content: "Please read these." },
    ];

    const res = await app.inject({
      method: "POST",
      url: "/api/cat/chat",
      payload: {
        messages,
        files: [
          {
            name: "first-note.txt",
            type: "text/plain",
            size: 24,
            content: "First tiny note.",
          },
          {
            name: "second-note.md",
            type: "text/markdown",
            size: 31,
            content: "# Second tiny note",
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(String(mockedRequest.mock.calls[0]?.[1]?.body));
    expect(body.messages).toEqual([
      ...messages,
      {
        role: "user",
        content: expect.stringContaining(
          "[Attachment 1: first-note.txt (text/plain, 24 bytes)]",
        ),
      },
    ]);
    expect(body.messages.at(-1).content).toContain("First tiny note.");
    expect(body.messages.at(-1).content).toContain(
      "[Attachment 2: second-note.md (text/markdown, 31 bytes)]",
    );
    expect(body.messages.at(-1).content).toContain("# Second tiny note");
  });

  it("reports LLM health through the configured upstream", async () => {
    mockLlmResponse("ok");

    const app = await createApp(makeEnv(), {
      webDistRoot: createTempWebDist(),
    });
    instances.push(app);

    const res = await app.inject({ method: "GET", url: "/api/cat/health" });
    const body = res.json() as {
      ok: boolean;
      target: string;
      upstreamStatus: number;
    };

    expect(res.statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.target).toBe("http://cat.local/");
    expect(body.upstreamStatus).toBe(200);
  });
});
