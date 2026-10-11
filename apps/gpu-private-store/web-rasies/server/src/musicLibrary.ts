import path from 'node:path';
import fs from 'node:fs/promises';
import { FastifyInstance } from 'fastify';
import { Env } from './env.js';

const MUSIC_LIBRARY_PAGE_PATH = '/music-library';
const MUSIC_LIBRARY_MEDIA_PATH = '/music-library-media';
const MAX_VISIBLE_ENTRIES = 400;

const AUDIO_EXTENSIONS = new Map([
  ['.aac', 'audio/aac'],
  ['.aif', 'audio/aiff'],
  ['.aiff', 'audio/aiff'],
  ['.flac', 'audio/flac'],
  ['.m4a', 'audio/mp4'],
  ['.m4b', 'audio/mp4'],
  ['.mp3', 'audio/mpeg'],
  ['.ogg', 'audio/ogg'],
  ['.opus', 'audio/ogg'],
  ['.wav', 'audio/wav'],
  ['.webm', 'audio/webm']
]);

type MusicBreadcrumb = {
  label: string;
  path: string;
  url: string;
};

type MusicDirectory = {
  name: string;
  path: string;
  url: string;
};

type MusicTrack = {
  fileName: string;
  title: string;
  path: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  modifiedAt: string;
};

export type MusicLibraryResponse = {
  available: boolean;
  currentPath: string;
  title: string;
  pageUrl: string;
  pageAbsoluteUrl: string;
  breadcrumbs: MusicBreadcrumb[];
  directories: MusicDirectory[];
  tracks: MusicTrack[];
  totalDirectories: number;
  totalTracks: number;
  truncated: boolean;
};

function naturalCompare(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

function normalizeRelativePath(value: string) {
  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function joinRelativePath(...parts: string[]) {
  return normalizeRelativePath(parts.filter(Boolean).join('/'));
}

function buildPageUrl(relativePath: string) {
  if (!relativePath) return MUSIC_LIBRARY_PAGE_PATH;
  return `${MUSIC_LIBRARY_PAGE_PATH}?path=${encodeURIComponent(relativePath)}`;
}

function buildMediaUrl(relativePath: string) {
  const normalized = normalizeRelativePath(relativePath);
  const encodedPath = normalized
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${MUSIC_LIBRARY_MEDIA_PATH}/${encodedPath}`;
}

function buildAbsoluteUrl(publicBaseUrl: string, pathname: string) {
  return new URL(pathname, publicBaseUrl).toString();
}

function getMimeType(fileName: string) {
  return AUDIO_EXTENSIONS.get(path.extname(fileName).toLowerCase());
}

function isAudioFile(fileName: string) {
  return AUDIO_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function humanizeTrackTitle(fileName: string) {
  const base = path
    .parse(fileName)
    .name.replace(/^\s*\d+([._ -]+\d+)?[._ -]+/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!base) return 'Untitled Track';
  return base.replace(/\b\w/g, (match) => match.toUpperCase());
}

function buildBreadcrumbs(publicBaseUrl: string, currentPath: string) {
  const breadcrumbs: MusicBreadcrumb[] = [
    {
      label: 'Music Library',
      path: '',
      url: buildPageUrl('')
    }
  ];

  let runningPath = '';
  for (const segment of currentPath.split('/').filter(Boolean)) {
    runningPath = joinRelativePath(runningPath, segment);
    breadcrumbs.push({
      label: segment,
      path: runningPath,
      url: buildPageUrl(runningPath)
    });
  }

  return breadcrumbs.map((breadcrumb) => ({
    ...breadcrumb,
    url: buildAbsoluteUrl(publicBaseUrl, breadcrumb.url)
  }));
}

function resolveMusicPath(root: string, rawPath: string) {
  const sanitized = normalizeRelativePath(
    path
      .normalize(rawPath || '.')
      .replace(/^(\.\.(\/|\\|$))+/, '')
      .replace(/^[/\\]+/, '')
  );

  const absolute = path.resolve(root, sanitized || '.');
  const relative = path.relative(root, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

  return {
    absolute,
    relative: normalizeRelativePath(relative)
  };
}

async function safeReaddir(dirPath: string) {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return null;
  }
}

function buildUnavailableResponse(env: Env) {
  return {
    available: false,
    currentPath: '',
    title: 'Music Library',
    pageUrl: MUSIC_LIBRARY_PAGE_PATH,
    pageAbsoluteUrl: buildAbsoluteUrl(env.PUBLIC_BASE_URL, MUSIC_LIBRARY_PAGE_PATH),
    breadcrumbs: buildBreadcrumbs(env.PUBLIC_BASE_URL, ''),
    directories: [],
    tracks: [],
    totalDirectories: 0,
    totalTracks: 0,
    truncated: false
  } satisfies MusicLibraryResponse;
}

async function readMusicDirectory(env: Env, rawPath: string) {
  const resolved = resolveMusicPath(env.MUSIC_LIBRARY_ROOT, rawPath);
  if (!resolved) return null;

  let stat;
  try {
    stat = await fs.stat(resolved.absolute);
  } catch {
    return resolved.relative ? null : buildUnavailableResponse(env);
  }

  if (!stat.isDirectory()) return null;

  const entries = await safeReaddir(resolved.absolute);
  if (!entries) {
    return resolved.relative ? null : buildUnavailableResponse(env);
  }

  const directories: MusicDirectory[] = [];
  const tracks: MusicTrack[] = [];
  let totalDirectories = 0;
  let totalTracks = 0;
  let visibleEntries = 0;

  for (const entry of entries.sort((left, right) => naturalCompare(left.name, right.name))) {
    if (entry.name.startsWith('.')) continue;

    if (entry.isDirectory()) {
      totalDirectories += 1;

      if (visibleEntries < MAX_VISIBLE_ENTRIES) {
        const nextPath = joinRelativePath(resolved.relative, entry.name);
        directories.push({
          name: entry.name,
          path: nextPath,
          url: buildPageUrl(nextPath)
        });
      }

      visibleEntries += 1;
      continue;
    }

    if (!entry.isFile() || !isAudioFile(entry.name)) continue;
    totalTracks += 1;

    if (visibleEntries >= MAX_VISIBLE_ENTRIES) {
      continue;
    }

    const absoluteFile = path.join(resolved.absolute, entry.name);
    const fileStat = await fs.stat(absoluteFile);
    const relativeFile = joinRelativePath(resolved.relative, entry.name);
    tracks.push({
      fileName: entry.name,
      title: humanizeTrackTitle(entry.name),
      path: relativeFile,
      url: buildMediaUrl(relativeFile),
      mimeType: getMimeType(entry.name) ?? 'audio/mpeg',
      sizeBytes: fileStat.size,
      modifiedAt: fileStat.mtime.toISOString()
    });
    visibleEntries += 1;
  }

  const currentPath = resolved.relative;
  const pageUrl = buildPageUrl(currentPath);

  return {
    available: true,
    currentPath,
    title: currentPath ? path.posix.basename(currentPath) : 'Music Library',
    pageUrl,
    pageAbsoluteUrl: buildAbsoluteUrl(env.PUBLIC_BASE_URL, pageUrl),
    breadcrumbs: buildBreadcrumbs(env.PUBLIC_BASE_URL, currentPath),
    directories,
    tracks,
    totalDirectories,
    totalTracks,
    truncated: totalDirectories + totalTracks > directories.length + tracks.length
  } satisfies MusicLibraryResponse;
}

export async function registerMusicLibraryRoutes(app: FastifyInstance, env: Env) {
  app.get('/api/music-library', async (req, reply) => {
    const query = (req.query as { path?: string } | undefined) ?? {};
    const response = await readMusicDirectory(env, query.path ?? '');

    if (!response) {
      return reply.code(404).send({ error: 'Music path not found' });
    }

    reply.header('cache-control', 'no-store');
    return response;
  });

  app.get(`${MUSIC_LIBRARY_MEDIA_PATH}/*`, async (req, reply) => {
    const params = req.params as { '*': string };
    const resolved = resolveMusicPath(env.MUSIC_LIBRARY_ROOT, params['*'] ?? '');

    if (!resolved || !resolved.relative) {
      return reply.code(404).send({ error: 'Track not found' });
    }

    const mimeType = getMimeType(resolved.relative);
    if (!mimeType) {
      return reply.code(404).send({ error: 'Track not found' });
    }

    try {
      const stat = await fs.stat(resolved.absolute);
      if (!stat.isFile()) {
        return reply.code(404).send({ error: 'Track not found' });
      }
    } catch {
      return reply.code(404).send({ error: 'Track not found' });
    }

    reply.type(mimeType);
    reply.header('cache-control', 'public, max-age=3600');
    return reply.sendFile(resolved.relative, env.MUSIC_LIBRARY_ROOT);
  });
}

export async function getMusicForHouse(env: Env) {
  return readMusicDirectory(env, '');
}
