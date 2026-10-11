import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { request } from 'undici';
import { Env } from './env.js';

const DEFAULT_PUBLIC_BLUEMAP_PATH = '/mc-troup-map';
const PRIVATE_HOST_SUFFIXES = ['.internal', '.lan', '.local', '.localdomain', '.home'];
const PRIVATE_IPV4_PATTERNS = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./
];

export function normalizeProxyPath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_PUBLIC_BLUEMAP_PATH;
  return trimmed.startsWith('/') ? trimmed.replace(/\/$/, '') : `/${trimmed.replace(/\/$/, '')}`;
}

function normalizeUpstreamBaseUrl(value: string) {
  const url = new URL(value);
  if (!url.pathname.endsWith('/')) {
    url.pathname = `${url.pathname}/`;
  }
  return url;
}

function normalizeBlueMapPath(value: string) {
  return normalizeProxyPath(value === '/' ? DEFAULT_PUBLIC_BLUEMAP_PATH : value || DEFAULT_PUBLIC_BLUEMAP_PATH);
}

export function extractServerHostname(serverHost: string) {
  const trimmed = serverHost.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('[')) {
    const end = trimmed.indexOf(']');
    return end >= 0 ? trimmed.slice(1, end) : trimmed.slice(1);
  }

  return trimmed.split(':', 1)[0] ?? trimmed;
}

export function isPrivateHostname(value: string) {
  const hostname = value.trim().replace(/^\[|\]$/g, '').toLowerCase();
  if (!hostname) return true;

  if (hostname === 'localhost' || hostname === '::1') return true;
  if (PRIVATE_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return true;
  if (PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(hostname))) return true;
  if (/^(fc|fd)[0-9a-f:]+$/i.test(hostname)) return true;
  if (/^fe80:/i.test(hostname)) return true;
  if (!hostname.includes('.') && !hostname.includes(':')) return true;

  return false;
}

export function derivePublicBlueMapUrl(serverHost: string, pathname = DEFAULT_PUBLIC_BLUEMAP_PATH) {
  const hostname = extractServerHostname(serverHost) || 'crafty.rasies.com';
  const url = new URL(`https://${hostname}`);
  url.pathname = `${normalizeBlueMapPath(pathname)}/`;
  return url.toString().replace(/\/$/, '');
}

export function resolveBlueMapBaseUrl(configuredUrl: string, serverHost: string) {
  const trimmed = configuredUrl.trim();
  if (!trimmed) return derivePublicBlueMapUrl(serverHost);

  try {
    const url = new URL(trimmed);
    const normalizedPath = normalizeBlueMapPath(url.pathname);

    if (isPrivateHostname(url.hostname)) {
      return derivePublicBlueMapUrl(serverHost, normalizedPath);
    }

    url.pathname = `${normalizedPath}/`;
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return derivePublicBlueMapUrl(serverHost);
  }
}

export function resolveBlueMapProxyBaseUrl(configuredUrl: string, serverHost: string) {
  const trimmed = configuredUrl.trim();
  if (!trimmed) return derivePublicBlueMapUrl(serverHost);

  try {
    const url = new URL(trimmed);
    const normalizedPath = normalizeBlueMapPath(url.pathname);
    url.pathname = `${normalizedPath}/`;
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return derivePublicBlueMapUrl(serverHost);
  }
}

export function buildTargetUrl(requestUrl: string, proxyPath: string, upstreamBaseUrl: string) {
  const base = normalizeUpstreamBaseUrl(upstreamBaseUrl);
  const suffix = requestUrl.startsWith(proxyPath) ? requestUrl.slice(proxyPath.length) : requestUrl;

  if (!suffix || suffix === '/') {
    return base.toString();
  }

  return new URL(suffix.replace(/^\//, ''), base).toString();
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Unknown error';
}

async function proxyBlueMapRequest({
  body,
  headers,
  method,
  reply,
  req,
  target,
  timeoutMs
}: {
  body?: Buffer | string;
  headers?: Record<string, string>;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  reply: FastifyReply;
  req: FastifyRequest;
  target: string;
  timeoutMs: number;
}) {
  try {
    const upstream = await request(target, {
      method,
      headers,
      body,
      headersTimeout: timeoutMs,
      bodyTimeout: timeoutMs * 3
    });

    reply.code(upstream.statusCode);
    for (const [key, value] of Object.entries(upstream.headers)) {
      if (!value) continue;
      if (['transfer-encoding', 'connection', 'keep-alive'].includes(key.toLowerCase())) continue;
      reply.header(key, value as string);
    }

    const buf = await upstream.body.arrayBuffer();
    return Buffer.from(buf);
  } catch (err: unknown) {
    req.log.error({ err, target }, 'mc troup proxy failed');
    return reply.code(502).send({
      error: 'BlueMap proxy failed',
      detail: errorMessage(err)
    });
  }
}

export async function registerMcTroupRoutes(app: FastifyInstance, env: Env) {
  const proxyPath = normalizeProxyPath(env.MC_TROUP_BLUEMAP_PROXY_PATH);
  const publicBlueMapUrl = resolveBlueMapBaseUrl(env.MC_TROUP_BLUEMAP_URL, env.MC_TROUP_SERVER_HOST);
  const upstreamBaseUrl = resolveBlueMapProxyBaseUrl(
    env.MC_TROUP_BLUEMAP_URL,
    env.MC_TROUP_SERVER_HOST
  );
  const methodFrom = (value: string) =>
    value as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

  app.get('/api/mc-troup', async () => {
    return {
      serverHost: env.MC_TROUP_SERVER_HOST,
      blueMapUrl: publicBlueMapUrl,
      blueMapEmbedUrl: `${proxyPath}/`
    };
  });

  app.all(`${proxyPath}`, async (req, reply) => {
    const target = buildTargetUrl(req.raw.url ?? req.url ?? proxyPath, proxyPath, upstreamBaseUrl);
    return proxyBlueMapRequest({
      method: methodFrom(req.method),
      reply,
      req,
      target,
      timeoutMs: env.STATUS_TIMEOUT_MS
    });
  });

  app.all(`${proxyPath}/*`, async (req, reply) => {
    const target = buildTargetUrl(req.raw.url ?? req.url ?? '/', proxyPath, upstreamBaseUrl);

    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : typeof req.body === 'string'
        ? req.body
        : req.body
          ? JSON.stringify(req.body)
          : undefined;

    const headers = { ...(req.headers as Record<string, string>) };
    delete headers.host;
    delete headers['content-length'];

    return proxyBlueMapRequest({
      body: rawBody,
      headers,
      method: methodFrom(req.method),
      reply,
      req,
      target,
      timeoutMs: env.STATUS_TIMEOUT_MS
    });
  });
}
