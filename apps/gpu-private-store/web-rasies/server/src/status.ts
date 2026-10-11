import { FastifyInstance } from 'fastify';
import { request } from 'undici';
import { Env } from './env.js';
import { resolveBlueMapBaseUrl } from './mcTroup.js';

type StatusState = 'up' | 'warn' | 'down';

type StatusTarget = {
  key: string;
  label: string;
  url: string;
  probeUrl?: string;
};

type StatusItem = StatusTarget & {
  state: StatusState;
  statusCode?: number;
  latencyMs?: number;
  detail?: string;
};

function buildInAppChatUrl(publicBaseUrl: string) {
  const url = new URL(publicBaseUrl);
  url.hash = 'chat';
  return url.toString();
}

function buildInAppChatHealthUrl(publicBaseUrl: string, publicProbeUrl?: string) {
  return new URL('/api/cat/health', publicProbeUrl ?? publicBaseUrl).toString();
}

function classifyStatus(statusCode: number): { state: StatusState; detail?: string } {
  if (statusCode >= 200 && statusCode < 400) {
    return { state: 'up' };
  }
  if (statusCode === 401 || statusCode === 403) {
    return { state: 'up', detail: 'Auth required' };
  }
  if (statusCode === 405) {
    return { state: 'up', detail: 'Method not allowed' };
  }
  if (statusCode >= 400 && statusCode < 500) {
    const detail = statusCode === 404 ? 'Not found' : 'Client error';
    return { state: 'warn', detail };
  }
  return { state: 'down', detail: 'Server error' };
}

function firstHeaderValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string
) {
  if (!headers) return undefined;
  const value = headers[name.toLowerCase()] ?? headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function isAuthentikFlowLocation(location: string | undefined, authentikUrl: string) {
  if (!location?.trim()) return false;

  try {
    const resolved = new URL(location, authentikUrl);
    const authentik = new URL(authentikUrl);
    return resolved.host === authentik.host || resolved.pathname.startsWith('/if/flow/');
  } catch {
    return /\/if\/flow\//i.test(location);
  }
}

export function classifyProbeResponse(
  target: StatusTarget,
  statusCode: number,
  location?: string,
  authentikUrl = 'https://auth.rasies.com/'
) {
  if (target.key === 'signup' && statusCode >= 300 && statusCode < 400) {
    if (isAuthentikFlowLocation(location, authentikUrl)) {
      return {
        state: 'warn' as const,
        detail: 'signup.rasies.com is landing on Authentik instead of Wizarr.'
      };
    }

    return { state: 'warn' as const, detail: 'Redirecting' };
  }

  return classifyStatus(statusCode);
}

async function probeTarget(target: StatusTarget, env: Env): Promise<StatusItem> {
  const startedAt = Date.now();
  try {
    const res = await request(target.probeUrl ?? target.url, {
      method: 'HEAD',
      headersTimeout: env.STATUS_TIMEOUT_MS,
      bodyTimeout: env.STATUS_TIMEOUT_MS
    });
    res.body?.resume?.();
    const latencyMs = Date.now() - startedAt;
    const location = firstHeaderValue(
      res.headers as Record<string, string | string[] | undefined>,
      'location'
    );
    const { state, detail } = classifyProbeResponse(
      target,
      res.statusCode,
      location,
      env.AUTHENTIK_URL
    );

    return {
      key: target.key,
      label: target.label,
      url: target.url,
      state,
      statusCode: res.statusCode,
      latencyMs,
      detail
    };
  } catch (err: unknown) {
    return {
      key: target.key,
      label: target.label,
      url: target.url,
      state: 'down',
      latencyMs: Date.now() - startedAt,
      detail: err instanceof Error ? err.message : 'No response'
    };
  }
}

export function buildTargets(env: Env): StatusTarget[] {
  return [
    {
      key: 'public',
      label: 'Front Porch',
      url: env.PUBLIC_BASE_URL,
      probeUrl: env.PUBLIC_PROBE_URL ?? env.PUBLIC_BASE_URL
    },
    {
      key: 'apps',
      label: 'Family Favorites Board',
      url: env.HEIMDALL_URL
    },
    {
      key: 'glance',
      label: 'Glance Dashboard',
      url: env.GLANCE_URL
    },
    {
      key: 'search',
      label: 'Quiet Search',
      url: new URL(env.SEARXNG_PATH, env.SEARXNG_BASE_URL).toString()
    },
    {
      key: 'chat',
      label: 'House Chat',
      url: env.CAT_PUBLIC_URL ?? buildInAppChatUrl(env.PUBLIC_BASE_URL),
      probeUrl: buildInAppChatHealthUrl(env.PUBLIC_BASE_URL, env.PUBLIC_PROBE_URL)
    },
    {
      key: 'mc-troup',
      label: 'MC Troup BlueMap',
      url: resolveBlueMapBaseUrl(env.MC_TROUP_BLUEMAP_URL, env.MC_TROUP_SERVER_HOST)
    },
    {
      key: 'auth',
      label: 'Family Sign-In',
      url: env.AUTHENTIK_URL
    },
    {
      key: 'signup',
      label: 'Family Signup Lane',
      url: env.SIGNUP_URL
    },
    {
      key: 'arcade',
      label: 'Game Room',
      url: env.GAMES_URL
    },
    {
      key: 'data',
      label: 'Data Vault',
      url: env.DATA_URL
    },
    {
      key: 'photos',
      label: 'Immich Photos',
      url: env.PHOTOS_URL
    },
    {
      key: 'send',
      label: 'Send Drop',
      url: env.SEND_URL
    },
    {
      key: 'grist',
      label: 'Grist Grid',
      url: env.GRIST_URL
    },
    {
      key: 'draw',
      label: 'Excalidraw',
      url: env.DRAW_URL
    },
    {
      key: 'affine',
      label: 'Affine Desk',
      url: env.AFFINE_URL
    }
  ];
}

export async function registerStatusRoutes(app: FastifyInstance, env: Env) {
  app.get('/api/status', async () => {
    const checkedAt = new Date().toISOString();
    const targets = buildTargets(env);
    const items = await Promise.all(
      targets.map((target) => probeTarget(target, env))
    );

    return { checkedAt, items };
  });
}

export async function getHouseStatus(env: Env) {
  const checkedAt = new Date().toISOString();
  const items = await Promise.all(buildTargets(env).map((target) => probeTarget(target, env)));
  return { checkedAt, items };
}
