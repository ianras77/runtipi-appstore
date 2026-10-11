import Fastify, { FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import staticPlugin from "@fastify/static";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { loadEnv, Env } from "./env.js";
import { registerSearchRoutes } from "./search.js";
import { registerCatRoutes } from "./cat.js";
import { registerStatusRoutes } from "./status.js";
import { registerMcTroupRoutes, resolveBlueMapBaseUrl } from "./mcTroup.js";
import { registerStoriesRoutes } from "./stories.js";
import { registerThoughtsRoutes } from "./thoughts.js";
import { registerMrRassySoundsRoutes } from "./mrRassySounds.js";
import { registerMusicLibraryRoutes } from "./musicLibrary.js";
import { registerSignupRoutes } from "./signup.js";
import { registerHouseRoutes } from "./house.js";

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/$/, "");
}

function getOriginVariants(value: string) {
  const normalized = normalizeOrigin(value);
  if (!normalized || normalized === "*") return normalized ? [normalized] : [];

  try {
    const url = new URL(normalized);
    const variants = new Set([url.origin]);
    const hostname = url.hostname.toLowerCase();
    const alternateHostname = hostname.startsWith("www.")
      ? hostname.slice(4)
      : `www.${hostname}`;
    const alternate = new URL(url.origin);
    alternate.hostname = alternateHostname;
    variants.add(alternate.origin);
    return Array.from(variants);
  } catch {
    return [normalized];
  }
}

function getRequestPathname(requestUrl: string) {
  try {
    return new URL(requestUrl, "http://rasies.local").pathname;
  } catch {
    return requestUrl.split("?")[0] || "/";
  }
}

function wantsSpaFallback(req: FastifyRequest) {
  const method = req.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return false;

  const pathname = getRequestPathname(req.raw.url ?? req.url ?? "/");
  if (path.extname(pathname)) return false;

  const accept =
    typeof req.headers.accept === "string" ? req.headers.accept : "";
  return accept.length === 0 || accept.includes("text/html");
}

type WebDistResolution = {
  root: string;
  ready: boolean;
};

type ResolveWebDistOptions = {
  strict?: boolean;
};

function ensureDevPlaceholder(root: string) {
  fs.mkdirSync(root, { recursive: true });
  const indexPath = path.join(root, "index.html");

  if (fs.existsSync(indexPath)) return;

  fs.writeFileSync(
    indexPath,
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Rasies Portal</title>
  </head>
  <body>
    <main>
      <h1>Frontend bundle not built yet</h1>
      <p>Run the web build or start the Vite dev server before opening the portal root.</p>
    </main>
  </body>
</html>
`,
  );
}

export function resolveWebDist(
  override?: string,
  options: ResolveWebDistOptions = {},
): WebDistResolution {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = override
    ? [path.resolve(override)]
    : [
        path.resolve(moduleDir, "../../web/dist"),
        path.resolve(process.cwd(), "web/dist"),
        path.resolve(process.cwd(), "../web/dist"),
      ];

  for (const candidate of candidates) {
    const indexPath = path.join(candidate, "index.html");
    if (fs.existsSync(indexPath)) {
      return { root: candidate, ready: true };
    }
  }

  if (options.strict) {
    throw new Error(
      "Missing built web bundle at web/dist. Rebuild the frontend before starting the production server.",
    );
  }

  const placeholder = path.resolve(process.cwd(), ".web-dist-empty");
  ensureDevPlaceholder(placeholder);
  return { root: placeholder, ready: false };
}

type CreateAppOptions = {
  webDistRoot?: string;
};

export async function createApp(
  env: Env = loadEnv(),
  options: CreateAppOptions = {},
) {
  const webDist = resolveWebDist(options.webDistRoot, {
    strict: process.env.NODE_ENV === "production",
  });

  const app = Fastify({
    logger: {
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      },
    },
  });

  const allowedOrigins = new Set(
    [env.PUBLIC_BASE_URL, ...env.ALLOWED_ORIGINS.split(",")]
      .flatMap(getOriginVariants)
      .filter(Boolean),
  );

  const startedAt = new Date().toISOString();
  const buildTag = process.env.BUILD_TAG || startedAt;

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const normalized = normalizeOrigin(origin);
      if (allowedOrigins.has("*")) return cb(null, true);
      if (allowedOrigins.has(normalized)) return cb(null, true);
      cb(null, false);
    },
  });

  await registerSearchRoutes(app, env);
  await registerCatRoutes(app, env);
  await registerStatusRoutes(app, env);
  await registerMcTroupRoutes(app, env);
  await registerStoriesRoutes(app, env);
  await registerThoughtsRoutes(app, env);
  await registerMrRassySoundsRoutes(app, env);
  await registerMusicLibraryRoutes(app, env);
  await registerSignupRoutes(app, env);
  await registerHouseRoutes(app, env);

  app.get("/api/config", async () => {
    const mcTroupBlueMapUrl = resolveBlueMapBaseUrl(
      env.MC_TROUP_BLUEMAP_URL,
      env.MC_TROUP_SERVER_HOST,
    );

    return {
      publicBaseUrl: env.PUBLIC_BASE_URL,
      personalSiteUrl: env.PERSONAL_SITE_URL,
      heimdallUrl: env.HEIMDALL_URL,
      searchUrl: env.SEARXNG_BASE_URL,
      glanceUrl: env.GLANCE_URL,
      gamesUrl: env.GAMES_URL,
      authentikUrl: env.AUTHENTIK_URL,
      signupUrl: env.SIGNUP_URL,
      plexUrl: env.PLEX_URL,
      signupEnabled: env.SIGNUP_URL.trim().length > 0,
      dataUrl: env.DATA_URL,
      photosUrl: env.PHOTOS_URL,
      sendUrl: env.SEND_URL,
      gristUrl: env.GRIST_URL,
      drawUrl: env.DRAW_URL,
      affineUrl: env.AFFINE_URL,
      mcTroupServerHost: env.MC_TROUP_SERVER_HOST,
      mcTroupBlueMapUrl,
      mcTroupBlueMapEmbedUrl: `${env.MC_TROUP_BLUEMAP_PROXY_PATH.replace(/\/$/, "")}/`,
      about: {
        name: env.ABOUT_NAME,
        tagline: env.ABOUT_TAGLINE,
        bio: env.ABOUT_BIO,
        highlights: env.ABOUT_HIGHLIGHTS.split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      },
    };
  });

  app.get("/api/version", async () => {
    return {
      buildTag,
      startedAt,
      now: new Date().toISOString(),
    };
  });

  app.get("/health", async () => ({ ok: true, webReady: webDist.ready }));
  app.get("/healthz", async () => ({ ok: true, webReady: webDist.ready }));
  await app.register(staticPlugin, {
    root: webDist.root,
    prefix: "/",
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath);
      if (ext === ".html" || filePath.endsWith("/")) {
        res.setHeader("cache-control", "no-store, must-revalidate");
        res.setHeader("pragma", "no-cache");
        res.setHeader("expires", "0");
      }
    },
  });

  app.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith("/api/")) {
      return reply.code(404).send({ error: "Not found" });
    }
    if (!wantsSpaFallback(req)) {
      return reply.code(404).send();
    }
    return reply.type("text/html; charset=utf-8").sendFile("index.html");
  });

  return app;
}
