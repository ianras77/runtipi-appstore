import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { request } from "undici";
import { Env } from "./env.js";

type RequestFn = typeof request;
type RequestOptions = NonNullable<Parameters<RequestFn>[1]>;

type WizarrServer = {
  id: number;
  name?: string;
  server_type?: string;
  server_url?: string;
  external_url?: string;
  verified?: boolean;
  allow_downloads?: boolean;
  allow_live_tv?: boolean;
  allow_mobile_uploads?: boolean;
};

type WizarrServerList = {
  servers?: WizarrServer[];
};

type WizarrInvitation = {
  id?: number;
  code?: string;
  url?: string;
  expires?: string;
  display_name?: string;
  status?: "pending" | "used" | "expired";
  used_by?: string | null;
  used_at?: string | null;
  server_names?: string[];
};

type WizarrInvitationResponse = {
  invitation?: WizarrInvitation;
  error?: string;
  message?: string;
};

type WizarrInvitationList = {
  invitations?: WizarrInvitation[];
};

type InvitationStatus = "pending" | "used" | "expired";

type SignupService = {
  id: number;
  name: string;
  type: string;
  url: string;
  verified: boolean;
  allowDownloads: boolean;
  allowLiveTv: boolean;
  allowMobileUploads: boolean;
};

type InviteCacheEntry = {
  inviteUrl: string;
  expiresAt?: string;
  code?: string;
  label: string;
  status: InvitationStatus;
  usedBy?: string | null;
  usedAt?: string | null;
  serverNames: string[];
  createdAtMs: number;
};

type CachedInviteResponse = Omit<InviteCacheEntry, "createdAtMs"> & {
  reused: true;
};

type ParsedInviteRequest = {
  serviceIds: number[] | null;
};

const INVITE_REUSE_WINDOW_MS = 1000 * 60 * 15;
const inviteCache = new Map<string, InviteCacheEntry>();

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function firstHeaderValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
) {
  if (!headers) return undefined;
  const value = headers[name.toLowerCase()] ?? headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function getHostLabel(rawUrl: string) {
  try {
    return new URL(rawUrl).host;
  } catch {
    return rawUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

function isAuthentikFlowLocation(location: string | undefined, env: Env) {
  if (!location?.trim()) return false;

  try {
    const resolved = new URL(location, env.WIZARR_BASE_URL);
    const authentik = new URL(env.AUTHENTIK_URL);
    return (
      resolved.host === authentik.host ||
      resolved.pathname.startsWith("/if/flow/")
    );
  } catch {
    return (
      /\/if\/flow\//i.test(location) ||
      location.includes(getHostLabel(env.AUTHENTIK_URL))
    );
  }
}

function describeUnexpectedWizarrRedirect(
  location: string | undefined,
  env: Env,
) {
  const signupHost = getHostLabel(env.SIGNUP_URL);

  if (isAuthentikFlowLocation(location, env)) {
    return `${signupHost} is landing on Authentik instead of Wizarr right now.`;
  }

  if (location?.trim()) {
    return `Wizarr at ${signupHost} redirected somewhere unexpected instead of serving signup.`;
  }

  return `Wizarr at ${signupHost} redirected before it could return signup data.`;
}

function describeUnexpectedWizarrPayload(url: string, text: string, env: Env) {
  const signupHost = getHostLabel(env.SIGNUP_URL);

  if (/authentik|\/if\/flow\//i.test(text)) {
    return `${signupHost} is landing on Authentik instead of Wizarr right now.`;
  }

  if (/<!doctype html|<html/i.test(text)) {
    return `Wizarr at ${signupHost} returned a web page instead of signup data.`;
  }

  try {
    const pathname = new URL(url).pathname;
    return `Wizarr at ${signupHost} returned unexpected data for ${pathname}.`;
  } catch {
    return `Wizarr at ${signupHost} returned unexpected signup data.`;
  }
}

function buildApiUrl(baseUrl: string, pathname: string) {
  return new URL(pathname, baseUrl).toString();
}

function normalizeInvitationStatus(
  status: string | undefined,
): InvitationStatus {
  if (status === "used" || status === "expired") return status;
  return "pending";
}

function normalizeServerType(value: string | undefined) {
  return value?.trim().toLowerCase() || "";
}

function normalizeServerNames(value: string[] | undefined) {
  return Array.from(
    new Set((value ?? []).map((item) => item.trim()).filter(Boolean)),
  );
}

function normalizeUrlCandidate(rawUrl: string | undefined) {
  if (!rawUrl?.trim()) return "";

  try {
    return new URL(rawUrl).toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function normalizeServiceUrl(server: WizarrServer) {
  const candidates = [server.external_url, server.server_url]
    .map((value) => normalizeUrlCandidate(value))
    .filter(Boolean);

  if (candidates.length === 0) return "";

  const httpsCandidate = candidates.find(
    (value) => new URL(value).protocol === "https:",
  );
  return httpsCandidate || candidates[0] || "";
}

function getServicePriority(service: SignupService) {
  const key = `${service.name} ${service.type}`.toLowerCase();
  if (key.includes("plex")) return 0;
  if (
    key.includes("music") ||
    key.includes("navidrome") ||
    key.includes("subsonic") ||
    key.includes("mstream")
  ) {
    return 1;
  }
  if (key.includes("audio")) return 2;
  if (key.includes("book")) return 3;
  return 4;
}

function normalizeSignupService(server: WizarrServer): SignupService | null {
  const url = normalizeServiceUrl(server);
  if (!url) return null;

  return {
    id: server.id,
    name: server.name?.trim() || `Service ${server.id}`,
    type: normalizeServerType(server.server_type) || "service",
    url,
    verified: Boolean(server.verified),
    allowDownloads: Boolean(server.allow_downloads),
    allowLiveTv: Boolean(server.allow_live_tv),
    allowMobileUploads: Boolean(server.allow_mobile_uploads),
  };
}

function normalizeInvite(invitation: WizarrInvitation | undefined, env: Env) {
  const code = invitation?.code?.trim();
  const serverNames = normalizeServerNames(invitation?.server_names);
  const label =
    serverNames.join(", ") ||
    invitation?.display_name?.trim() ||
    "Media access";

  return {
    inviteUrl: normalizeInviteUrl(invitation?.url, env.SIGNUP_URL),
    expiresAt: invitation?.expires,
    code,
    label,
    status: normalizeInvitationStatus(invitation?.status),
    usedBy: invitation?.used_by?.trim() || null,
    usedAt: invitation?.used_at?.trim() || null,
    serverNames,
  };
}

export function parseIntegerList(value: string | undefined) {
  return Array.from(
    new Set(
      (value ?? "")
        .split(",")
        .map((item) => Number.parseInt(item.trim(), 10))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  );
}

export function normalizeInviteUrl(
  inviteUrl: string | undefined,
  publicBaseUrl: string,
) {
  const fallback = new URL(publicBaseUrl);
  fallback.search = "";
  fallback.hash = "";

  if (!inviteUrl?.trim()) {
    return fallback.toString();
  }

  try {
    const rawInvite = new URL(inviteUrl, publicBaseUrl);
    rawInvite.protocol = fallback.protocol;
    rawInvite.host = fallback.host;
    return rawInvite.toString();
  } catch {
    return fallback.toString();
  }
}

function parseRequestedServiceIds(body: unknown): ParsedInviteRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { serviceIds: null };
  }

  const value = (body as Record<string, unknown>).serviceIds;
  if (typeof value === "undefined") {
    return { serviceIds: null };
  }

  if (!Array.isArray(value)) {
    return { serviceIds: [] };
  }

  return {
    serviceIds: Array.from(
      new Set(
        value
          .map((item) => Number.parseInt(String(item), 10))
          .filter((item) => Number.isInteger(item) && item > 0),
      ),
    ).sort((a, b) => a - b),
  };
}

function getClientCacheKey(req: FastifyRequest, selectionKey = "all") {
  const forwarded =
    typeof req.headers["x-forwarded-for"] === "string"
      ? req.headers["x-forwarded-for"].split(",")[0]?.trim()
      : "";

  const clientKey = forwarded || req.ip || "anonymous";
  return `${clientKey}::${selectionKey}`;
}

function readCachedInvite(
  cacheKey: string,
  now = Date.now(),
): CachedInviteResponse | null {
  const cached = inviteCache.get(cacheKey);
  if (!cached) return null;

  if (cached.expiresAt) {
    const expiresAtMs = Date.parse(cached.expiresAt);
    if (Number.isFinite(expiresAtMs) && expiresAtMs <= now) {
      inviteCache.delete(cacheKey);
      return null;
    }
  }

  if (now - cached.createdAtMs > INVITE_REUSE_WINDOW_MS) {
    inviteCache.delete(cacheKey);
    return null;
  }

  return {
    inviteUrl: cached.inviteUrl,
    expiresAt: cached.expiresAt,
    code: cached.code,
    label: cached.label,
    status: cached.status,
    usedBy: cached.usedBy,
    usedAt: cached.usedAt,
    serverNames: cached.serverNames,
    reused: true,
  };
}

function storeCachedInvite(
  cacheKey: string,
  invite: Omit<InviteCacheEntry, "createdAtMs">,
  now = Date.now(),
) {
  inviteCache.set(cacheKey, { ...invite, createdAtMs: now });
}

async function requestJson<T>(
  url: string,
  options: RequestOptions,
  env: Env,
  requestImpl: RequestFn = request,
) {
  const res = await requestImpl(url, {
    ...options,
    headersTimeout: env.WIZARR_TIMEOUT_MS,
    bodyTimeout: env.WIZARR_TIMEOUT_MS,
  });

  const location = firstHeaderValue(
    res.headers as Record<string, string | string[] | undefined>,
    "location",
  );
  const text = await res.body.text();

  if (res.statusCode >= 300 && res.statusCode < 400) {
    throw new Error(describeUnexpectedWizarrRedirect(location, env));
  }

  const parsed = safeJsonParse(text);
  const payload =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as T & { error?: string; message?: string })
      : null;

  if (!payload) {
    throw new Error(describeUnexpectedWizarrPayload(url, text, env));
  }

  if (res.statusCode >= 400) {
    const message =
      (typeof payload?.error === "string" && payload.error.trim()) ||
      (typeof payload?.message === "string" && payload.message.trim()) ||
      `HTTP ${res.statusCode}`;
    throw new Error(message);
  }

  return payload as T;
}

async function fetchWizarrServers(env: Env, requestImpl: RequestFn = request) {
  if (!env.WIZARR_API_KEY.trim()) return [];

  const payload = await requestJson<WizarrServerList>(
    buildApiUrl(env.WIZARR_BASE_URL, "/api/servers"),
    {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-api-key": env.WIZARR_API_KEY,
      },
    },
    env,
    requestImpl,
  );

  return payload?.servers ?? [];
}

export async function fetchSignupServices(
  env: Env,
  requestImpl: RequestFn = request,
) {
  const servers = await fetchWizarrServers(env, requestImpl);

  return servers
    .map((server) => normalizeSignupService(server))
    .filter((service): service is SignupService => Boolean(service))
    .sort(
      (a, b) =>
        getServicePriority(a) - getServicePriority(b) ||
        a.name.localeCompare(b.name),
    );
}

function resolveInviteDuration(env: Env) {
  const trimmed = env.WIZARR_INVITE_DURATION.trim();
  return trimmed.length > 0 ? trimmed : "unlimited";
}

function isUnlimitedDuration(duration: string) {
  return duration.trim().toLowerCase() === "unlimited";
}

async function resolveInviteServices(
  env: Env,
  requestedServiceIds: number[],
  requestImpl: RequestFn = request,
) {
  const services = await fetchSignupServices(env, requestImpl);

  if (requestedServiceIds.length > 0) {
    const requestedIdSet = new Set(requestedServiceIds);
    const selectedServices = services.filter((service) =>
      requestedIdSet.has(service.id),
    );

    if (selectedServices.length !== requestedIdSet.size) {
      throw new Error(
        "One or more selected media services are not available in Wizarr right now.",
      );
    }

    return selectedServices;
  }

  const explicitIds = parseIntegerList(env.WIZARR_PLEX_SERVER_IDS);
  if (explicitIds.length > 0) {
    const explicitIdSet = new Set(explicitIds);
    const selectedServices = services.filter((service) =>
      explicitIdSet.has(service.id),
    );

    if (selectedServices.length > 0) {
      return selectedServices;
    }
  }

  return services;
}

export async function resolveSignupServerIds(
  env: Env,
  requestedServiceIds: number[] = [],
  requestImpl: RequestFn = request,
) {
  return (
    await resolveInviteServices(env, requestedServiceIds, requestImpl)
  ).map((service) => service.id);
}

export async function createSignupInvite(
  env: Env,
  requestedServiceIds: number[] = [],
  requestImpl: RequestFn = request,
) {
  if (!env.WIZARR_API_KEY.trim()) {
    throw new Error("Wizarr invite creation is not configured yet.");
  }

  const requestedServices = await resolveInviteServices(
    env,
    requestedServiceIds,
    requestImpl,
  );
  if (requestedServices.length === 0) {
    throw new Error("No media services are configured in Wizarr yet.");
  }

  const serverIds = requestedServices.map((service) => service.id);
  const fallbackServerNames = requestedServices.map((service) => service.name);
  const duration = resolveInviteDuration(env);
  const payload = {
    server_ids: serverIds,
    expires_in_days: env.WIZARR_INVITE_EXPIRES_DAYS,
    duration,
    unlimited: isUnlimitedDuration(duration),
  };

  const response = await requestJson<WizarrInvitationResponse>(
    buildApiUrl(env.WIZARR_BASE_URL, "/api/invitations"),
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-api-key": env.WIZARR_API_KEY,
      },
      body: JSON.stringify(payload),
    },
    env,
    requestImpl,
  );

  const createdInvite = normalizeInvite(response?.invitation, env);
  const inviteCode = createdInvite.code?.trim();

  if (inviteCode) {
    try {
      const latestInvite = await findInvitationByCode(
        env,
        inviteCode,
        requestImpl,
      );
      if (latestInvite) {
        return latestInvite;
      }
    } catch {
      /* fall back to the create response */
    }
  }

  if (createdInvite.serverNames.length > 0) {
    return createdInvite;
  }

  return {
    ...createdInvite,
    label: fallbackServerNames.join(", ") || createdInvite.label,
    serverNames: fallbackServerNames,
  };
}

export async function findInvitationByCode(
  env: Env,
  code: string,
  requestImpl: RequestFn = request,
) {
  const trimmed = code.trim();
  if (!trimmed || !env.WIZARR_API_KEY.trim()) return null;

  const payload = await requestJson<WizarrInvitationList>(
    buildApiUrl(env.WIZARR_BASE_URL, "/api/invitations"),
    {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-api-key": env.WIZARR_API_KEY,
      },
    },
    env,
    requestImpl,
  );

  const invitation = (payload?.invitations ?? []).find(
    (item) => item.code?.trim().toLowerCase() === trimmed.toLowerCase(),
  );

  return invitation ? normalizeInvite(invitation, env) : null;
}

function getInviteErrorStatus(message: string) {
  if (/Pick at least one|selected media services/i.test(message)) {
    return 400;
  }
  if (
    /not configured|No media services|instead of Wizarr|returned a web page|unexpected signup data|unexpected data/i.test(
      message,
    )
  ) {
    return 503;
  }
  return 502;
}

function buildInviteStatusHandler(env: Env) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const code =
      typeof req.query === "object" &&
      req.query &&
      "code" in req.query &&
      typeof (req.query as Record<string, unknown>).code === "string"
        ? (req.query as Record<string, string>).code
        : "";

    if (!code.trim()) {
      return reply.code(400).send({ error: "Missing invite code." });
    }

    try {
      const invite = await findInvitationByCode(env, code);
      if (!invite) {
        return reply.code(404).send({
          error: "Invite not found.",
          detail: "No invite matched that code.",
        });
      }
      return invite;
    } catch (err: unknown) {
      req.log.error({ err }, "wizarr invite status lookup failed");
      const message = err instanceof Error ? err.message : "Unknown error";
      return reply.code(getInviteErrorStatus(message)).send({
        error: "Could not load invite status right now.",
        detail: message,
      });
    }
  };
}

function buildInviteCreateHandler(env: Env) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const { serviceIds } = parseRequestedServiceIds(req.body);
    if (serviceIds && serviceIds.length === 0) {
      return reply
        .code(400)
        .send({ error: "Pick at least one media service." });
    }

    const selectionKey = serviceIds?.join(",") || "all";
    const cacheKey = getClientCacheKey(req, selectionKey);
    const cached = readCachedInvite(cacheKey);

    if (cached) {
      if (!cached.code) {
        return cached;
      }

      try {
        const latest = await findInvitationByCode(env, cached.code);
        if (latest?.status === "pending") {
          const next = { ...cached, ...latest, reused: true as const };
          storeCachedInvite(cacheKey, next);
          return next;
        }

        if (
          latest?.status === "used" ||
          latest?.status === "expired" ||
          !latest
        ) {
          inviteCache.delete(cacheKey);
        } else {
          return cached;
        }
      } catch {
        return cached;
      }
    }

    try {
      const invite = await createSignupInvite(env, serviceIds ?? []);
      storeCachedInvite(cacheKey, invite);
      return invite;
    } catch (err: unknown) {
      req.log.error({ err }, "wizarr invite creation failed");
      const message = err instanceof Error ? err.message : "Unknown error";
      return reply.code(getInviteErrorStatus(message)).send({
        error: "Could not create a media invite right now.",
        detail: message,
      });
    }
  };
}

export async function registerSignupRoutes(app: FastifyInstance, env: Env) {
  app.get("/api/signup/services", async (req, reply) => {
    try {
      const services = await fetchSignupServices(env);
      return { services };
    } catch (err: unknown) {
      req.log.error({ err }, "wizarr services lookup failed");
      const message = err instanceof Error ? err.message : "Unknown error";
      return reply.code(getInviteErrorStatus(message)).send({
        error: "Could not load media services right now.",
        detail: message,
      });
    }
  });

  const inviteStatusHandler = buildInviteStatusHandler(env);
  const inviteCreateHandler = buildInviteCreateHandler(env);

  app.get("/api/signup/invite-status", inviteStatusHandler);
  app.get("/api/signup/plex-invite-status", inviteStatusHandler);
  app.post("/api/signup/invite", inviteCreateHandler);
  app.post("/api/signup/plex-invite", inviteCreateHandler);
}
