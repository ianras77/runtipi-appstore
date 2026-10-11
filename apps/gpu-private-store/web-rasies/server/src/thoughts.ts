import path from 'node:path';
import fs from 'node:fs/promises';
import { FastifyInstance } from 'fastify';
import { Env } from './env.js';

const THOUGHTS_PAGE_PATH = '/thoughts';
const THOUGHTS_MEDIA_PATH = '/thoughts-media';
const THOUGHTS_CACHE_TTL_MS = 1000 * 5;
const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);
const THOUGHT_ASSET_EXTENSIONS = new Set([
  '.avif',
  '.gif',
  '.jpeg',
  '.jpg',
  '.m4a',
  '.mp3',
  '.mp4',
  '.ogg',
  '.pdf',
  '.png',
  '.wav',
  '.webm',
  '.webp'
]);

type ThoughtFrontMatter = {
  title?: string;
  summary?: string;
  excerpt?: string;
  description?: string;
  slug?: string;
  publishedAt?: string;
  featured?: boolean;
  tags?: string[];
};

export type ThoughtSummary = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  readingMinutes: number;
  featured: boolean;
  tags: string[];
  pageUrl: string;
  pageAbsoluteUrl: string;
};

type Thought = ThoughtSummary & {
  content: string;
  sourcePath: string;
  assetBaseUrl: string;
};

export type ThoughtsLibrary = {
  featuredThought?: ThoughtSummary;
  thoughts: ThoughtSummary[];
};

type ThoughtsDetailResponse = {
  thought: Thought;
};

type ThoughtsCache = {
  expiresAt: number;
  value: ThoughtsLibrary;
  thoughts: Thought[];
};

let thoughtsCache: ThoughtsCache | null = null;

export function resetThoughtsCache() {
  thoughtsCache = null;
}

function buildAbsoluteUrl(publicBaseUrl: string, pathname: string) {
  return new URL(pathname, publicBaseUrl).toString();
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'thought';
}

function humanizeName(value: string) {
  const base = value
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!base) return 'Untitled Thought';
  return base.replace(/\b\w/g, (match) => match.toUpperCase());
}

function stripLeadingDate(value: string) {
  return value.replace(/^\d{4}-\d{2}-\d{2}[-_]+/, '').trim();
}

function ensureUniqueSlug(baseSlug: string, seen: Set<string>) {
  let slug = baseSlug;
  let suffix = 2;

  while (seen.has(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  seen.add(slug);
  return slug;
}

function toIsoDateOrFallback(value: string, fallbackDate: Date) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallbackDate.toISOString();
  }
  return parsed.toISOString();
}

function isMarkdownFile(fileName: string) {
  return MARKDOWN_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function naturalCompare(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim();

  if (!trimmed) return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => String(parseScalar(item)));
  }

  return trimmed;
}

function parseFrontMatter(source: string) {
  if (!source.startsWith('---')) {
    return { data: {} as ThoughtFrontMatter, content: source.trim() };
  }

  const lines = source.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    return { data: {} as ThoughtFrontMatter, content: source.trim() };
  }

  const frontMatterLines: string[] = [];
  let index = 1;

  while (index < lines.length && lines[index]?.trim() !== '---') {
    frontMatterLines.push(lines[index] ?? '');
    index += 1;
  }

  if (index >= lines.length) {
    return { data: {} as ThoughtFrontMatter, content: source.trim() };
  }

  const data: Record<string, unknown> = {};
  let activeListKey: string | null = null;

  for (const rawLine of frontMatterLines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('- ') && activeListKey) {
      const list = Array.isArray(data[activeListKey]) ? (data[activeListKey] as unknown[]) : [];
      list.push(parseScalar(trimmed.slice(2)));
      data[activeListKey] = list;
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!match) {
      activeListKey = null;
      continue;
    }

    const [, key, rawValue = ''] = match;
    if (!rawValue.trim()) {
      data[key] = [];
      activeListKey = key;
      continue;
    }

    data[key] = parseScalar(rawValue);
    activeListKey = null;
  }

  return {
    data: data as ThoughtFrontMatter,
    content: lines.slice(index + 1).join('\n').trim()
  };
}

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/[_*~]/g, '')
    .replace(/\r/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function summarizeContent(content: string) {
  const plain = stripMarkdown(content);
  if (!plain) return 'A quiet note from Rassy.';
  if (plain.length <= 180) return plain;
  return `${plain.slice(0, 177).trimEnd()}...`;
}

function countReadingMinutes(content: string) {
  const words = stripMarkdown(content)
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 225));
}

function toTagList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanText(item))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function toThoughtAssetBaseUrl(sourcePath: string) {
  const normalized = sourcePath.replace(/\\/g, '/');
  const dir = path.posix.dirname(normalized);
  if (!dir || dir === '.') return `${THOUGHTS_MEDIA_PATH}/`;
  return `${THOUGHTS_MEDIA_PATH}/${dir.replace(/\/$/, '')}/`;
}

async function safeReaddir(dirPath: string) {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function walkThoughtFiles(root: string, current = ''): Promise<string[]> {
  const dirPath = current ? path.join(root, current) : root;
  const entries = await safeReaddir(dirPath);
  const files: string[] = [];

  for (const entry of entries.sort((left, right) => naturalCompare(left.name, right.name))) {
    if (entry.name.startsWith('.')) continue;

    const relativePath = current ? path.join(current, entry.name) : entry.name;

    if (entry.isDirectory()) {
      files.push(...(await walkThoughtFiles(root, relativePath)));
      continue;
    }

    if (!entry.isFile() || !isMarkdownFile(entry.name)) continue;
    if (/^readme\.markdown?$/i.test(entry.name)) continue;

    files.push(relativePath);
  }

  return files;
}

async function scanThoughtsLibrary(env: Env) {
  const markdownFiles = await walkThoughtFiles(env.THOUGHTS_ROOT);
  const thoughts: Thought[] = [];
  const usedSlugs = new Set<string>();

  for (const relativePath of markdownFiles) {
    const filePath = path.join(env.THOUGHTS_ROOT, relativePath);
    const stat = await fs.stat(filePath);
    const source = await fs.readFile(filePath, 'utf8');
    const parsed = parseFrontMatter(source);
    const baseName = path.basename(relativePath);
    const relativeDir = path.dirname(relativePath);
    const baseSlugPart = stripLeadingDate(path.basename(relativePath, path.extname(relativePath)));
    const relativeBase =
      (relativeDir === '.' ? baseSlugPart : path.join(relativeDir, baseSlugPart)).replace(
        /[\\/]+/g,
        '-'
      );
    const title = cleanText(parsed.data.title) || humanizeName(baseName);
    const summary =
      cleanText(parsed.data.summary) ||
      cleanText(parsed.data.excerpt) ||
      cleanText(parsed.data.description) ||
      summarizeContent(parsed.content);
    const publishedAtRaw = cleanText(parsed.data.publishedAt);
    const slug = ensureUniqueSlug(
      normalizeSlug(cleanText(parsed.data.slug) || relativeBase),
      usedSlugs
    );
    const pageUrl = `${THOUGHTS_PAGE_PATH}/${slug}`;

    thoughts.push({
      slug,
      title,
      summary,
      publishedAt: publishedAtRaw
        ? toIsoDateOrFallback(publishedAtRaw, stat.mtime)
        : stat.mtime.toISOString(),
      readingMinutes: countReadingMinutes(parsed.content),
      featured: Boolean(parsed.data.featured),
      tags: toTagList(parsed.data.tags),
      pageUrl,
      pageAbsoluteUrl: buildAbsoluteUrl(env.PUBLIC_BASE_URL, pageUrl),
      content: parsed.content,
      sourcePath: relativePath,
      assetBaseUrl: toThoughtAssetBaseUrl(relativePath)
    });
  }

  thoughts.sort(
    (left, right) =>
      Number(right.featured) - Number(left.featured) ||
      new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime() ||
      left.title.localeCompare(right.title, undefined, { sensitivity: 'base' })
  );

  const summaries = thoughts.map<ThoughtSummary>((thought) => ({
    slug: thought.slug,
    title: thought.title,
    summary: thought.summary,
    publishedAt: thought.publishedAt,
    readingMinutes: thought.readingMinutes,
    featured: thought.featured,
    tags: thought.tags,
    pageUrl: thought.pageUrl,
    pageAbsoluteUrl: thought.pageAbsoluteUrl
  }));

  return {
    value: {
      featuredThought: summaries.find((thought) => thought.featured) ?? summaries[0],
      thoughts: summaries
    } satisfies ThoughtsLibrary,
    thoughts
  };
}

async function getThoughtsCache(env: Env) {
  const now = Date.now();
  if (thoughtsCache && thoughtsCache.expiresAt > now) {
    return thoughtsCache;
  }

  const scanned = await scanThoughtsLibrary(env);
  thoughtsCache = {
    ...scanned,
    expiresAt: now + THOUGHTS_CACHE_TTL_MS
  };
  return thoughtsCache;
}

export async function getThoughtsForHouse(env: Env) {
  return (await getThoughtsCache(env)).thoughts.map((thought) => ({
    slug: thought.slug,
    title: thought.title,
    summary: thought.summary,
    publishedAt: thought.publishedAt,
    readingMinutes: thought.readingMinutes,
    featured: thought.featured,
    tags: thought.tags,
    pageUrl: thought.pageUrl,
    pageAbsoluteUrl: thought.pageAbsoluteUrl,
  }));
}

function resolveThoughtsMediaPath(root: string, rawPath: string) {
  const normalized = path.normalize(rawPath).replace(/^(\.\.(\/|\\|$))+/, '').trim();
  if (!normalized) return null;

  const absolute = path.resolve(root, normalized);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

  return { absolute, relative };
}

function isServableThoughtAsset(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  if (segments.some((segment) => segment.startsWith('.'))) return false;

  const extension = path.extname(normalized).toLowerCase();
  return THOUGHT_ASSET_EXTENSIONS.has(extension);
}

export async function registerThoughtsRoutes(app: FastifyInstance, env: Env) {
  app.get('/api/thoughts', async (_req, reply) => {
    const cache = await getThoughtsCache(env);
    reply.header('cache-control', 'no-store');
    return cache.value;
  });

  app.get('/api/thoughts/:slug', async (req, reply) => {
    const params = req.params as { slug: string };
    const cache = await getThoughtsCache(env);
    const thought = cache.thoughts.find((item) => item.slug === params.slug);

    if (!thought) {
      return reply.code(404).send({ error: 'Thought not found' });
    }

    const response: ThoughtsDetailResponse = {
      thought
    };

    reply.header('cache-control', 'no-store');
    return response;
  });

  app.get(`${THOUGHTS_MEDIA_PATH}/*`, async (req, reply) => {
    const params = req.params as { '*': string };
    const resolved = resolveThoughtsMediaPath(env.THOUGHTS_ROOT, params['*'] ?? '');

    if (!resolved || !isServableThoughtAsset(resolved.relative)) {
      return reply.code(404).send({ error: 'Media not found' });
    }

    try {
      const stat = await fs.stat(resolved.absolute);
      if (!stat.isFile()) {
        return reply.code(404).send({ error: 'Media not found' });
      }
    } catch {
      return reply.code(404).send({ error: 'Media not found' });
    }

    reply.header('cache-control', 'public, max-age=3600');
    return reply.sendFile(resolved.relative, env.THOUGHTS_ROOT);
  });
}
