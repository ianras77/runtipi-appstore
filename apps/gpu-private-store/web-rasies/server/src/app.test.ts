import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, resolveWebDist } from "./app.js";
import { loadEnv } from "./env.js";

const instances: { close: () => Promise<void> }[] = [];
const tempDirs: string[] = [];
const previousNodeEnv = process.env.NODE_ENV;

afterEach(async () => {
  for (const app of instances.splice(0)) {
    await app.close();
  }

  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  process.env.NODE_ENV = previousNodeEnv;
});

describe("app", () => {
  function createTempWebDist() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rasies-web-dist-"));
    tempDirs.push(dir);
    fs.writeFileSync(
      path.join(dir, "index.html"),
      "<!doctype html><html><body>portal</body></html>",
    );
    return dir;
  }

  it("serves config from /api/config", async () => {
    const env = loadEnv();
    const app = await createApp(env, { webDistRoot: createTempWebDist() });
    instances.push(app);

    const res = await app.inject({ method: "GET", url: "/api/config" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown> & {
      about?: { bio?: string; name?: string };
    };
    expect(body.publicBaseUrl).toBe(env.PUBLIC_BASE_URL);
    expect(body.personalSiteUrl).toBe(env.PERSONAL_SITE_URL);
    expect(body.searchUrl).toBe(env.SEARXNG_BASE_URL);
    expect(body.signupUrl).toBe(env.SIGNUP_URL);
    expect(body.plexUrl).toBe(env.PLEX_URL);
    expect(body.signupEnabled).toBe(true);
    expect(body.about?.name).toBeDefined();
    expect(body.about?.bio ?? "").not.toMatch(/\bI built this\b/i);
  });

  it("allows both bare and www Rasies origins for browser API calls", async () => {
    const env = {
      ...loadEnv(),
      PUBLIC_BASE_URL: "https://www.rasies.com",
      ALLOWED_ORIGINS: "",
    };
    const app = await createApp(env, { webDistRoot: createTempWebDist() });
    instances.push(app);

    for (const origin of ["https://www.rasies.com", "https://rasies.com"]) {
      const res = await app.inject({
        method: "OPTIONS",
        url: "/api/cat/chat",
        headers: {
          origin,
          "access-control-request-method": "POST",
        },
      });

      expect(res.statusCode).toBe(204);
      expect(res.headers["access-control-allow-origin"]).toBe(origin);
    }
  });

  it("sanitizes a private BlueMap config URL before returning it", async () => {
    const env = {
      ...loadEnv(),
      MC_TROUP_SERVER_HOST: "crafty.rasies.com:25565",
      MC_TROUP_BLUEMAP_URL: "http://192.168.100.10:8100",
    };

    const app = await createApp(env, { webDistRoot: createTempWebDist() });
    instances.push(app);

    const res = await app.inject({ method: "GET", url: "/api/config" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as Record<string, unknown>;
    expect(body.mcTroupBlueMapUrl).toBe(
      "https://crafty.rasies.com/mc-troup-map",
    );
  });

  it("serves the built frontend root when a web dist is available", async () => {
    const app = await createApp(loadEnv(), {
      webDistRoot: createTempWebDist(),
    });
    instances.push(app);

    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.body).toContain("portal");
  });

  it("returns a real 404 for missing frontend assets", async () => {
    const app = await createApp(loadEnv(), {
      webDistRoot: createTempWebDist(),
    });
    instances.push(app);

    const res = await app.inject({ method: "GET", url: "/missing.js" });
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"] ?? "").not.toContain("text/html");
  });

  it("fails fast in production when the web dist is missing", async () => {
    const missingDir = path.join(
      os.tmpdir(),
      `rasies-missing-web-dist-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );

    expect(() => resolveWebDist(missingDir, { strict: true })).toThrow(
      /Missing built web bundle/i,
    );
  });
});
