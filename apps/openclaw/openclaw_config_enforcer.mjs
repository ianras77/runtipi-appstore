import fs from "node:fs";
import path from "node:path";

const CONFIG_PATH = process.env.OPENCLAW_CONFIG_PATH || "/home/node/.openclaw/openclaw.json";
const PRIMARY_MODEL = String(process.env.OPENCLAW_PRIMARY_MODEL_REF || "").trim();
const FALLBACK_MODEL = String(process.env.OPENCLAW_FALLBACK_MODEL_REF || "").trim();
const AUX_MODEL = FALLBACK_MODEL || PRIMARY_MODEL;
const EMBEDDING_MODEL = String(process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text:latest").trim();
const FRONTEND_URL = String(process.env.OPENCLAW_FRONTEND_URL || "").trim();
const TIMEOUT_SECONDS = Number(process.env.OPENCLAW_AGENT_TIMEOUT_SECONDS || "60");
const INTERVAL_MS = Number(process.env.OPENCLAW_CONFIG_ENFORCER_INTERVAL_MS || "15000");
const RUN_ONCE = process.argv.includes("--once");

const desiredModel = {
  primary: PRIMARY_MODEL,
  fallbacks: FALLBACK_MODEL ? [FALLBACK_MODEL] : [],
};

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function normalizeModelEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return { params: { maxTokens: 512 } };
  }

  const params =
    entry.params && typeof entry.params === "object" && !Array.isArray(entry.params)
      ? entry.params
      : {};

  return {
    ...entry,
    params: {
      maxTokens: 512,
      ...params,
    },
  };
}

function ensureDesiredConfig(config) {
  const next = structuredClone(config);

  next.gateway = normalizeObject(next.gateway);
  next.gateway.controlUi = normalizeObject(next.gateway.controlUi);
  next.gateway.controlUi.enabled = true;
  delete next.gateway.controlUi.basePath;
  if (FRONTEND_URL) {
    const allowedOrigins = Array.isArray(next.gateway.controlUi.allowedOrigins)
      ? next.gateway.controlUi.allowedOrigins
      : [];
    next.gateway.controlUi.allowedOrigins = uniqueStrings([...allowedOrigins, FRONTEND_URL]);
  }

  next.tools = normalizeObject(next.tools);
  next.tools.profile = "coding";
  next.tools.alsoAllow = uniqueStrings([
    ...(Array.isArray(next.tools.alsoAllow) ? next.tools.alsoAllow : []),
    "browser",
  ]);
  delete next.tools.byProvider;

  next.browser = normalizeObject(next.browser);
  next.browser.enabled = true;
  next.browser.defaultProfile = "openclaw";
  next.browser.headless = true;
  next.browser.noSandbox = true;

  next.plugins = normalizeObject(next.plugins);
  next.plugins.entries = normalizeObject(next.plugins.entries);
  next.plugins.entries.bonjour = {
    ...normalizeObject(next.plugins.entries.bonjour),
    enabled: false,
  };
  next.plugins.entries["active-memory"] = {
    ...normalizeObject(next.plugins.entries["active-memory"]),
    enabled: false,
  };

  next.agents = normalizeObject(next.agents);
  next.agents.defaults = normalizeObject(next.agents.defaults);
  next.agents.defaults.model = desiredModel;
  next.agents.defaults.timeoutSeconds = TIMEOUT_SECONDS;
  next.agents.defaults.models = normalizeObject(next.agents.defaults.models);

  if (PRIMARY_MODEL) {
    next.agents.defaults.models[PRIMARY_MODEL] = normalizeModelEntry(
      next.agents.defaults.models[PRIMARY_MODEL],
    );
  }

  if (FALLBACK_MODEL) {
    next.agents.defaults.models[FALLBACK_MODEL] = normalizeModelEntry(
      next.agents.defaults.models[FALLBACK_MODEL],
    );
  }

  const orderedModels = {};
  if (PRIMARY_MODEL && next.agents.defaults.models[PRIMARY_MODEL]) {
    orderedModels[PRIMARY_MODEL] = next.agents.defaults.models[PRIMARY_MODEL];
  }
  if (FALLBACK_MODEL && next.agents.defaults.models[FALLBACK_MODEL]) {
    orderedModels[FALLBACK_MODEL] = next.agents.defaults.models[FALLBACK_MODEL];
  }
  for (const [key, value] of Object.entries(next.agents.defaults.models)) {
    if (!(key in orderedModels)) {
      orderedModels[key] = value;
    }
  }
  next.agents.defaults.models = orderedModels;

  next.agents.defaults.memorySearch = {
    ...normalizeObject(next.agents.defaults.memorySearch),
    provider: "ollama",
    model: EMBEDDING_MODEL,
    fallback: "none",
    query: {
      ...normalizeObject(next.agents.defaults.memorySearch?.query),
      hybrid: {
        ...normalizeObject(next.agents.defaults.memorySearch?.query?.hybrid),
        mmr: {
          ...normalizeObject(next.agents.defaults.memorySearch?.query?.hybrid?.mmr),
          enabled: true,
        },
        temporalDecay: {
          ...normalizeObject(next.agents.defaults.memorySearch?.query?.hybrid?.temporalDecay),
          enabled: true,
          halfLifeDays: Number(
            next.agents.defaults.memorySearch?.query?.hybrid?.temporalDecay?.halfLifeDays || 30,
          ),
        },
      },
    },
  };

  next.agents.defaults.subagents = {
    ...normalizeObject(next.agents.defaults.subagents),
    ...(AUX_MODEL ? { model: AUX_MODEL } : {}),
    thinking: "low",
    runTimeoutSeconds: 600,
    maxSpawnDepth: 2,
    maxChildrenPerAgent: 4,
    maxConcurrent: 4,
  };

  const existingAgents = Array.isArray(next.agents.list) ? next.agents.list : [];
  const currentMain = normalizeObject(existingAgents.find((agent) => agent?.id === "main"));
  const restAgents = existingAgents.filter((agent) => agent?.id !== "main");
  const mainTools = normalizeObject(currentMain.tools);
  const mainSubagents = normalizeObject(currentMain.subagents);

  next.agents.list = [
    {
      ...currentMain,
      id: "main",
      model: desiredModel,
      tools: {
        ...mainTools,
        profile: "coding",
        alsoAllow: uniqueStrings([
          ...(Array.isArray(mainTools.alsoAllow) ? mainTools.alsoAllow : []),
          "browser",
        ]),
      },
      subagents: {
        ...mainSubagents,
        ...(AUX_MODEL ? { model: AUX_MODEL } : {}),
        thinking: "low",
      },
    },
    ...restAgents,
  ];

  return next;
}

function writeConfig(config) {
  const dirname = path.dirname(CONFIG_PATH);
  const tmpPath = path.join(dirname, `.${path.basename(CONFIG_PATH)}.enforcer.tmp`);
  fs.writeFileSync(tmpPath, `${JSON.stringify(config, null, 2)}\n`);
  fs.renameSync(tmpPath, CONFIG_PATH);
}

function enforce() {
  if (!PRIMARY_MODEL) {
    return;
  }

  const current = readConfig();
  const next = ensureDesiredConfig(current);

  if (JSON.stringify(current) !== JSON.stringify(next)) {
    writeConfig(next);
    process.stdout.write(
      `openclaw-config-enforcer applied primary=${PRIMARY_MODEL} fallback=${FALLBACK_MODEL || "none"} timeout=${TIMEOUT_SECONDS} tools=coding browser=on active-memory=off bonjour=off\n`,
    );
  }
}

enforce();

if (RUN_ONCE) {
  process.exit(0);
}

setInterval(() => {
  try {
    enforce();
  } catch (error) {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    process.stderr.write(`${message}\n`);
  }
}, INTERVAL_MS);
