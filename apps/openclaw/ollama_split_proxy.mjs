import http from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const LISTEN_HOST = process.env.PROXY_HOST || "0.0.0.0";
const LISTEN_PORT = Number(process.env.PROXY_PORT || "11436");
const CHAT_BASES = parseBaseList(
  process.env.CHAT_BASES || process.env.CHAT_BASE || "http://192.168.1.162:11435",
);
const EMBED_BASE = normalizeBase(process.env.EMBED_BASE || "http://192.168.1.162:11437");
const INCLUDE_EMBED_MODELS_IN_TAGS = /^true$/i.test(
  process.env.INCLUDE_EMBED_MODELS_IN_TAGS || "false",
);
const MODEL_CACHE_TTL_MS = Number(process.env.MODEL_CACHE_TTL_MS || "30000");

let modelCatalog;
let modelCatalogLoadedAt = 0;
let modelCatalogPromise;

function normalizeBase(value) {
  return value.trim().replace(/\/+$/, "");
}

function parseBaseList(value) {
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(normalizeBase);
}

const stripHopByHopHeaders = (headers) => {
  const next = { ...headers };
  next["accept-encoding"] = "identity";
  delete next.connection;
  delete next["content-length"];
  delete next["transfer-encoding"];
  delete next.host;
  return next;
};

const isHopByHopResponseHeader = (key) => {
  return (
    key === "connection" ||
    key === "keep-alive" ||
    key === "proxy-authenticate" ||
    key === "proxy-authorization" ||
    key === "te" ||
    key === "trailers" ||
    key === "content-encoding" ||
    key === "content-length" ||
    key === "transfer-encoding" ||
    key === "upgrade"
  );
};

const readRequestBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const buffer = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!buffer || !contentType.includes("json")) {
    return { buffer, json: undefined };
  }

  try {
    return { buffer, json: JSON.parse(buffer.toString("utf8")) };
  } catch {
    return { buffer, json: undefined };
  }
};

const fetchTags = async (base) => {
  const response = await fetch(new URL("/api/tags", `${base}/`));
  if (!response.ok) {
    throw new Error(`GET ${base}/api/tags returned ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.models) ? payload.models : [];
};

const uniqueModels = (models) => {
  const seen = new Set();
  const result = [];

  for (const model of models) {
    if (!model || typeof model !== "object") continue;
    const key = String(model.model || model.name || "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(model);
  }

  return result;
};

const loadModelCatalog = async (forceRefresh = false) => {
  const stale =
    !modelCatalog ||
    modelCatalogLoadedAt === 0 ||
    Date.now() - modelCatalogLoadedAt > MODEL_CACHE_TTL_MS;
  if (!forceRefresh && !stale) {
    return modelCatalog;
  }

  if (!forceRefresh && modelCatalogPromise) {
    return modelCatalogPromise;
  }

  modelCatalogPromise = (async () => {
    const chatResponses = await Promise.all(
      CHAT_BASES.map(async (base) => ({
        base,
        models: await fetchTags(base),
      })),
    );

    let embedModels = [];
    try {
      embedModels = await fetchTags(EMBED_BASE);
    } catch {
      embedModels = [];
    }

    const modelToBase = new Map();
    for (const { base, models } of chatResponses) {
      for (const model of models) {
        const key = String(model?.model || model?.name || "").trim();
        if (key && !modelToBase.has(key)) {
          modelToBase.set(key, base);
        }
      }
    }

    const embedModelNames = new Set(
      embedModels
        .map((model) => String(model?.model || model?.name || "").trim())
        .filter(Boolean),
    );

    const chatModels = uniqueModels(chatResponses.flatMap(({ models }) => models));
    const tagModels = INCLUDE_EMBED_MODELS_IN_TAGS
      ? uniqueModels([...chatModels, ...embedModels])
      : chatModels;

    modelCatalog = {
      chatModels,
      tagModels,
      embedModelNames,
      modelToBase,
    };
    modelCatalogLoadedAt = Date.now();
    return modelCatalog;
  })();

  try {
    return await modelCatalogPromise;
  } finally {
    modelCatalogPromise = undefined;
  }
};

const getRequestPath = (urlPath = "/") => {
  return new URL(urlPath, "http://proxy.local").pathname.toLowerCase();
};

const isEmbedPath = (path) => {
  return path.includes("/embed") || path.includes("/embedd") || path.includes("/rerank");
};

const getRequestedModel = (json) => {
  if (!json || typeof json !== "object") return "";
  const value = json.model ?? json.name ?? "";
  return typeof value === "string" ? value.trim() : "";
};

const chooseTargetBases = ({ urlPath, requestedModel, catalog }) => {
  const path = getRequestPath(urlPath);
  if (isEmbedPath(path)) {
    return [EMBED_BASE];
  }

  if (requestedModel && catalog?.embedModelNames?.has(requestedModel)) {
    return [EMBED_BASE];
  }

  const mappedBase = requestedModel ? catalog?.modelToBase?.get(requestedModel) : undefined;
  if (mappedBase) {
    return [mappedBase];
  }

  return CHAT_BASES;
};

const writeResponse = async (res, upstream) => {
  res.statusCode = upstream.status;
  res.statusMessage = upstream.statusText;
  for (const [key, value] of upstream.headers.entries()) {
    if (isHopByHopResponseHeader(key)) continue;
    res.setHeader(key, value);
  }

  if (!upstream.body) {
    res.end();
    return;
  }

  await pipeline(Readable.fromWeb(upstream.body), res);
};

const proxyToCandidates = async ({ req, res, body, bases }) => {
  let lastResponse;
  let lastError;

  for (const base of bases) {
    try {
      const targetUrl = new URL(req.url || "/", `${base}/`);
      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers: stripHopByHopHeaders(req.headers),
        body,
        duplex: body ? "half" : undefined,
      });

      if (upstream.status === 404 && bases.length > 1) {
        lastResponse = upstream;
        continue;
      }

      await writeResponse(res, upstream);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastResponse) {
    await writeResponse(res, lastResponse);
    return;
  }

  throw lastError || new Error("no upstream candidate succeeded");
};

const server = http.createServer(async (req, res) => {
  try {
    const { buffer: body, json } = await readRequestBody(req);
    const path = getRequestPath(req.url);
    const catalog = await loadModelCatalog(path === "/api/tags");

    if (path === "/api/tags") {
      const responseBody = Buffer.from(JSON.stringify({ models: catalog.tagModels }));
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.setHeader("content-length", String(responseBody.length));
      res.end(responseBody);
      return;
    }

    const requestedModel = getRequestedModel(json);
    const targetBases = chooseTargetBases({
      urlPath: req.url,
      requestedModel,
      catalog,
    });
    await proxyToCandidates({ req, res, body, bases: targetBases });
  } catch (error) {
    if (res.headersSent) {
      if (!res.writableEnded) {
        res.end();
      }
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    res.statusCode = 502;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: message }));
  }
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  process.stdout.write(
    `ollama-split-proxy listening on http://${LISTEN_HOST}:${LISTEN_PORT} chats=${CHAT_BASES.join(",")} embed=${EMBED_BASE}\n`,
  );
});
