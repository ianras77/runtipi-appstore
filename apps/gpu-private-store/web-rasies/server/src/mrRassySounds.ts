import path from 'node:path';
import fs from 'node:fs/promises';
import { FastifyInstance } from 'fastify';
import { Env } from './env.js';

const MR_RASSY_SOUNDS_MEDIA_PATH = '/mr-rassy-sounds-media';
const MR_RASSY_SOUNDS_CACHE_TTL_MS = 1000 * 5;

const AUDIO_EXTENSIONS = new Map([
  ['.aac', 'audio/aac'],
  ['.flac', 'audio/flac'],
  ['.m4a', 'audio/mp4'],
  ['.m4b', 'audio/mp4'],
  ['.mp3', 'audio/mpeg'],
  ['.ogg', 'audio/ogg'],
  ['.opus', 'audio/ogg'],
  ['.wav', 'audio/wav']
]);

type MrRassySound = {
  slug: string;
  title: string;
  fileName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
};

type MrRassySoundsResponse = {
  count: number;
  sounds: MrRassySound[];
};

type MrRassySoundsCache = {
  expiresAt: number;
  value: MrRassySoundsResponse;
  files: Set<string>;
};

let mrRassySoundsCache: MrRassySoundsCache | null = null;

export function resetMrRassySoundsCache() {
  mrRassySoundsCache = null;
}

function normalizeSlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'sound';
}

function humanizeName(value: string) {
  const base = value
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!base) return 'Untitled Sound';
  return base.replace(/\b\w/g, (match) => match.toUpperCase());
}

async function safeReaddir(dirPath: string) {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function scanMrRassySounds(env: Env) {
  const entries = await safeReaddir(env.MR_RASSY_SOUNDS_ROOT);
  const files = entries
    .filter(
      (entry) => entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    )
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }));

  const sounds: MrRassySound[] = [];
  for (const fileName of files) {
    const stat = await fs.stat(path.join(env.MR_RASSY_SOUNDS_ROOT, fileName));
    const mimeType = AUDIO_EXTENSIONS.get(path.extname(fileName).toLowerCase()) ?? 'audio/mpeg';

    sounds.push({
      slug: normalizeSlug(path.parse(fileName).name),
      title: humanizeName(fileName),
      fileName,
      url: `${MR_RASSY_SOUNDS_MEDIA_PATH}/${encodeURIComponent(fileName)}`,
      mimeType,
      sizeBytes: stat.size
    });
  }

  return {
    value: {
      count: sounds.length,
      sounds
    } satisfies MrRassySoundsResponse,
    files: new Set(files)
  };
}

async function getMrRassySoundsCache(env: Env) {
  const now = Date.now();
  if (mrRassySoundsCache && mrRassySoundsCache.expiresAt > now) {
    return mrRassySoundsCache;
  }

  const scanned = await scanMrRassySounds(env);
  mrRassySoundsCache = {
    ...scanned,
    expiresAt: now + MR_RASSY_SOUNDS_CACHE_TTL_MS
  };
  return mrRassySoundsCache;
}

export async function registerMrRassySoundsRoutes(app: FastifyInstance, env: Env) {
  app.get('/api/mr-rassy/sounds', async (_req, reply) => {
    const cache = await getMrRassySoundsCache(env);
    reply.header('cache-control', 'no-store');
    return cache.value;
  });

  app.get(`${MR_RASSY_SOUNDS_MEDIA_PATH}/:fileName`, async (req, reply) => {
    const params = req.params as { fileName: string };
    const fileName = path.basename(params.fileName);
    const cache = await getMrRassySoundsCache(env);

    if (!cache.files.has(fileName)) {
      return reply.code(404).send({ error: 'Sound not found' });
    }

    const mimeType = AUDIO_EXTENSIONS.get(path.extname(fileName).toLowerCase());
    if (mimeType) {
      reply.type(mimeType);
    }
    reply.header('cache-control', 'public, max-age=3600');
    return reply.sendFile(fileName, env.MR_RASSY_SOUNDS_ROOT);
  });
}
