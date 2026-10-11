import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { FastifyInstance } from 'fastify';
import { Env } from './env.js';

const STORIES_PAGE_PATH = '/bedtime-stories';
const STORIES_FEED_PATH = '/podcast/real-life-bedtime-stories.xml';
const STORIES_MEDIA_PATH = '/stories-media';
const STORIES_CACHE_TTL_MS = 1000 * 5;

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

const IMAGE_EXTENSIONS = new Map([
  ['.avif', 'image/avif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp']
]);

type ShowConfig = {
  title?: string;
  subtitle?: string;
  description?: string;
  author?: string;
  ownerName?: string;
  ownerEmail?: string;
  cover?: string;
};

type BookConfig = {
  slug?: string;
  title?: string;
  subtitle?: string;
  author?: string;
  summary?: string;
  description?: string;
  purchaseLabel?: string;
  purchaseUrl?: string;
  amazonUrl?: string;
  amazonAsin?: string;
  cover?: string;
  season?: number;
  featured?: boolean;
};

type EpisodeConfig = {
  title?: string;
  summary?: string;
  description?: string;
  publishedAt?: string;
  episode?: number;
};

type StoryEpisode = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  episodeNumber: number;
  publishedAt: string;
  audioUrl: string;
  audioAbsoluteUrl: string;
  audioMimeType: string;
  sizeBytes: number;
  pageUrl: string;
  pageAbsoluteUrl: string;
};

type StoryBookSummary = {
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  summary: string;
  description: string;
  seasonNumber: number;
  featured: boolean;
  coverUrl?: string;
  coverAbsoluteUrl?: string;
  purchaseUrl?: string;
  purchaseLabel?: string;
  pageUrl: string;
  pageAbsoluteUrl: string;
  seasonFeedUrl: string;
  seasonFeedAbsoluteUrl: string;
  episodeCount: number;
  latestEpisodePublishedAt?: string;
  latestEpisodeTitle?: string;
};

type StoryBook = StoryBookSummary & {
  folderName: string;
  episodes: StoryEpisode[];
  files: Set<string>;
  coverFileName?: string;
  seasonLocked: boolean;
};

export type StoriesLibrary = {
  show: {
    title: string;
    subtitle: string;
    description: string;
    author: string;
    language: string;
    ownerName: string;
    ownerEmail?: string;
    pagePath: string;
    pageUrl: string;
    pageAbsoluteUrl: string;
    feedPath: string;
    feedUrl: string;
    feedAbsoluteUrl: string;
    imageUrl?: string;
    imageAbsoluteUrl?: string;
    bookCount: number;
    episodeCount: number;
  };
  featuredBook?: StoryBookSummary;
  books: StoryBookSummary[];
};

type StoriesDetailResponse = {
  show: StoriesLibrary['show'];
  book: StoryBookSummary & {
    episodes: StoryEpisode[];
  };
};

type StoriesCache = {
  expiresAt: number;
  value: StoriesLibrary;
  books: StoryBook[];
  showCoverFileName?: string;
};

let storiesCache: StoriesCache | null = null;

export function resetStoriesCache() {
  storiesCache = null;
}

function normalizePathname(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function buildAbsoluteUrl(publicBaseUrl: string, pathname: string) {
  return new URL(pathname, publicBaseUrl).toString();
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
  return normalized || 'story';
}

function humanizeName(value: string) {
  const base = value
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!base) return 'Untitled Story';
  return base.replace(/\b\w/g, (match) => match.toUpperCase());
}

function stripLeadingOrder(value: string) {
  return value.replace(/^\s*\d+([._ -]+\d+)?[._ -]+/, '').trim();
}

function naturalCompare(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

function inferOrder(value: string, fallback: number) {
  const matched = value.match(/^\s*(\d+)/);
  return matched ? Number.parseInt(matched[1], 10) : fallback;
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

function getMimeType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  return AUDIO_EXTENSIONS.get(ext) ?? IMAGE_EXTENSIONS.get(ext);
}

function isAudioFile(fileName: string) {
  return AUDIO_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function isImageFile(fileName: string) {
  return IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function summarizeDescription(description: string) {
  const trimmed = description.trim();
  if (!trimmed) return 'A cozy bedtime reading from Rassy.';
  if (trimmed.length <= 180) return trimmed;
  return `${trimmed.slice(0, 177).trimEnd()}...`;
}

function toIsoDateOrFallback(value: string, fallbackDate: Date) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallbackDate.toISOString();
  }
  return parsed.toISOString();
}

function appendAmazonTag(urlValue: string, tag?: string) {
  if (!tag) return urlValue;

  try {
    const url = new URL(urlValue);
    if (!url.hostname.includes('amazon.')) return urlValue;
    if (!url.searchParams.get('tag')) {
      url.searchParams.set('tag', tag);
    }
    return url.toString();
  } catch {
    return urlValue;
  }
}

function resolvePurchaseUrl(config: BookConfig | null, amazonTag?: string) {
  if (!config) return undefined;
  const direct = cleanText(config.purchaseUrl) || cleanText(config.amazonUrl);
  if (direct) return appendAmazonTag(direct, amazonTag);

  const asin = cleanText(config.amazonAsin);
  if (!asin) return undefined;
  const url = new URL(`https://www.amazon.com/dp/${asin}`);
  if (amazonTag) url.searchParams.set('tag', amazonTag);
  return url.toString();
}

function toPublicMediaPath(...segments: string[]) {
  return `${STORIES_MEDIA_PATH}/${segments.map((segment) => encodeURIComponent(segment)).join('/')}`;
}

function toEpisodeSlug(fileName: string, fallback: number) {
  const cleaned = stripLeadingOrder(path.parse(fileName).name) || path.parse(fileName).name;
  return normalizeSlug(cleaned || `episode-${fallback}`);
}

async function readJsonFile<T>(filePath: string) {
  if (!existsSync(filePath)) return null;

  try {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function safeReaddir(dirPath: string) {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

function pickCoverFile(fileNames: string[], preferred?: string) {
  if (preferred && fileNames.includes(preferred)) return preferred;

  for (const candidate of ['cover.jpg', 'cover.png', 'cover.webp', 'cover.jpeg', 'book.jpg', 'book.png']) {
    if (fileNames.includes(candidate)) return candidate;
  }

  return fileNames.find((fileName) => isImageFile(fileName));
}

async function resolveShowMetadata(env: Env, rootPath: string) {
  const config = await readJsonFile<ShowConfig>(path.join(rootPath, 'podcast.json'));
  const rootEntries = await safeReaddir(rootPath);
  const rootFiles = rootEntries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  const coverFileName = pickCoverFile(rootFiles, cleanText(config?.cover));

  const pageUrl = STORIES_PAGE_PATH;
  const feedUrl = STORIES_FEED_PATH;

  const show = {
    title: cleanText(config?.title) || env.BEDTIME_STORIES_SHOW_TITLE,
    subtitle: cleanText(config?.subtitle) || env.BEDTIME_STORIES_SHOW_SUBTITLE,
    description: cleanText(config?.description) || env.BEDTIME_STORIES_SHOW_DESCRIPTION,
    author: cleanText(config?.author) || env.BEDTIME_STORIES_SHOW_AUTHOR,
    language: env.BEDTIME_STORIES_SHOW_LANGUAGE,
    ownerName: cleanText(config?.ownerName) || env.BEDTIME_STORIES_OWNER_NAME || env.BEDTIME_STORIES_SHOW_AUTHOR,
    ownerEmail: cleanText(config?.ownerEmail) || env.BEDTIME_STORIES_OWNER_EMAIL || undefined,
    pagePath: STORIES_PAGE_PATH,
    pageUrl,
    pageAbsoluteUrl: buildAbsoluteUrl(env.PUBLIC_BASE_URL, pageUrl),
    feedPath: STORIES_FEED_PATH,
    feedUrl,
    feedAbsoluteUrl: buildAbsoluteUrl(env.PUBLIC_BASE_URL, feedUrl),
    imageUrl: coverFileName ? toPublicMediaPath('show', coverFileName) : undefined,
    imageAbsoluteUrl: coverFileName
      ? buildAbsoluteUrl(env.PUBLIC_BASE_URL, toPublicMediaPath('show', coverFileName))
      : undefined,
    bookCount: 0,
    episodeCount: 0
  };

  return { show, coverFileName };
}

async function buildStoryBook(
  env: Env,
  rootPath: string,
  folderName: string,
  assignedSlug: string,
  seasonFallback: number
) {
  const folderPath = path.join(rootPath, folderName);
  const config = await readJsonFile<BookConfig>(path.join(folderPath, 'book.json'));
  const entries = await safeReaddir(folderPath);
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  const audioFiles = files.filter((fileName) => isAudioFile(fileName)).sort(naturalCompare);

  if (audioFiles.length === 0 && !config) {
    return null;
  }

  const seasonNumber =
    typeof config?.season === 'number' && Number.isFinite(config.season)
      ? config.season
      : seasonFallback;
  const seasonLocked =
    typeof config?.season === 'number' && Number.isFinite(config.season);

  const coverFileName = pickCoverFile(files, cleanText(config?.cover));
  const title =
    cleanText(config?.title) || humanizeName(folderName);
  const subtitle = cleanText(config?.subtitle);
  const description =
    cleanText(config?.description) ||
    cleanText(config?.summary) ||
    `Rassy reads ${title} one warm episode at a time.`;
  const summary = cleanText(config?.summary) || summarizeDescription(description);
  const author = cleanText(config?.author) || 'Rassy';
  const pageUrl = `${STORIES_PAGE_PATH}/${assignedSlug}`;
  const seasonFeedUrl = `${STORIES_FEED_PATH.replace(/\.xml$/i, '')}/${assignedSlug}.xml`;
  const purchaseUrl = resolvePurchaseUrl(config, env.BEDTIME_STORIES_AMAZON_TAG);
  const purchaseLabel = purchaseUrl
    ? cleanText(config?.purchaseLabel) || 'Buy the book on Amazon'
    : undefined;

  const episodes: StoryEpisode[] = [];
  const usedEpisodeSlugs = new Set<string>();

  for (const [index, fileName] of audioFiles.entries()) {
    const parsed = path.parse(fileName);
    const sidecar = await readJsonFile<EpisodeConfig>(path.join(folderPath, `${parsed.name}.json`));
    const stat = await fs.stat(path.join(folderPath, fileName));
    const inferredTitle = humanizeName(stripLeadingOrder(parsed.name) || parsed.name);
    const titleFromConfig = cleanText(sidecar?.title);
    const title = titleFromConfig || inferredTitle;
    const description =
      cleanText(sidecar?.description) ||
      cleanText(sidecar?.summary) ||
      `Episode ${index + 1} from ${title}.`;
    const summary = cleanText(sidecar?.summary) || summarizeDescription(description);
    const episodeNumber =
      typeof sidecar?.episode === 'number' && Number.isFinite(sidecar.episode)
        ? sidecar.episode
        : inferOrder(parsed.name, index + 1);
    const publishedAtRaw = cleanText(sidecar?.publishedAt);
    const publishedAt = publishedAtRaw
      ? toIsoDateOrFallback(publishedAtRaw, stat.mtime)
      : stat.mtime.toISOString();
    const audioUrl = toPublicMediaPath(assignedSlug, fileName);
    const episodeSlug = ensureUniqueSlug(toEpisodeSlug(fileName, index + 1), usedEpisodeSlugs);
    const pageAnchor = `${pageUrl}#${episodeSlug}`;

    episodes.push({
      slug: episodeSlug,
      title,
      summary,
      description,
      episodeNumber,
      publishedAt,
      audioUrl,
      audioAbsoluteUrl: buildAbsoluteUrl(env.PUBLIC_BASE_URL, audioUrl),
      audioMimeType: AUDIO_EXTENSIONS.get(path.extname(fileName).toLowerCase()) ?? 'audio/mpeg',
      sizeBytes: stat.size,
      pageUrl: pageAnchor,
      pageAbsoluteUrl: buildAbsoluteUrl(env.PUBLIC_BASE_URL, pageAnchor)
    } satisfies StoryEpisode);
  }

  episodes.sort((left, right) => left.episodeNumber - right.episodeNumber || naturalCompare(left.title, right.title));

  const latestEpisode = [...episodes].sort(
    (left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()
  )[0];

  return {
    folderName,
    slug: assignedSlug,
    title,
    subtitle,
    author,
    summary,
    description,
    seasonNumber,
    featured: Boolean(config?.featured),
    coverFileName,
    coverUrl: coverFileName ? toPublicMediaPath(assignedSlug, coverFileName) : undefined,
    coverAbsoluteUrl: coverFileName
      ? buildAbsoluteUrl(env.PUBLIC_BASE_URL, toPublicMediaPath(assignedSlug, coverFileName))
      : undefined,
    purchaseUrl,
    purchaseLabel,
    pageUrl,
    pageAbsoluteUrl: buildAbsoluteUrl(env.PUBLIC_BASE_URL, pageUrl),
    seasonFeedUrl,
    seasonFeedAbsoluteUrl: buildAbsoluteUrl(env.PUBLIC_BASE_URL, seasonFeedUrl),
    episodeCount: episodes.length,
    latestEpisodePublishedAt: latestEpisode?.publishedAt,
    latestEpisodeTitle: latestEpisode?.title,
    episodes,
    files: new Set(files),
    seasonLocked
  } satisfies StoryBook;
}

async function scanStoriesLibrary(env: Env) {
  const rootPath = env.BEDTIME_STORIES_ROOT;
  const { show: baseShow, coverFileName } = await resolveShowMetadata(env, rootPath);
  const entries = await safeReaddir(rootPath);
  const folders = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort(naturalCompare);

  const assignedSlugs = new Set<string>();
  const rawBooks: StoryBook[] = [];

  for (const [index, folderName] of folders.entries()) {
    const config = await readJsonFile<BookConfig>(path.join(rootPath, folderName, 'book.json'));
    const desiredSlug = normalizeSlug(cleanText(config?.slug) || folderName);
    let slug = desiredSlug;
    let counter = 2;
    while (assignedSlugs.has(slug)) {
      slug = `${desiredSlug}-${counter}`;
      counter += 1;
    }
    assignedSlugs.add(slug);

    const book = await buildStoryBook(env, rootPath, folderName, slug, index + 1);
    if (book) {
      rawBooks.push(book);
    }
  }

  rawBooks.sort(
    (left, right) =>
      Number(right.featured) - Number(left.featured) ||
      Number(right.seasonLocked) - Number(left.seasonLocked) ||
      left.seasonNumber - right.seasonNumber ||
      naturalCompare(left.title, right.title)
  );

  const assignedSeasons = new Set<number>();
  let nextSeasonNumber = 1;
  const books = rawBooks.map((book) => {
    if (book.seasonLocked && book.seasonNumber > 0 && !assignedSeasons.has(book.seasonNumber)) {
      assignedSeasons.add(book.seasonNumber);
      return book;
    }

    while (assignedSeasons.has(nextSeasonNumber)) {
      nextSeasonNumber += 1;
    }

    const seasonNumber = nextSeasonNumber;
    assignedSeasons.add(seasonNumber);
    nextSeasonNumber += 1;

    return {
      ...book,
      seasonNumber
    };
  });

  const summaryBooks = books.map<StoryBookSummary>((book) => ({
    slug: book.slug,
    title: book.title,
    subtitle: book.subtitle,
    author: book.author,
    summary: book.summary,
    description: book.description,
    seasonNumber: book.seasonNumber,
    featured: book.featured,
    coverUrl: book.coverUrl,
    coverAbsoluteUrl: book.coverAbsoluteUrl,
    purchaseUrl: book.purchaseUrl,
    purchaseLabel: book.purchaseLabel,
    pageUrl: book.pageUrl,
    pageAbsoluteUrl: book.pageAbsoluteUrl,
    seasonFeedUrl: book.seasonFeedUrl,
    seasonFeedAbsoluteUrl: book.seasonFeedAbsoluteUrl,
    episodeCount: book.episodeCount,
    latestEpisodePublishedAt: book.latestEpisodePublishedAt,
    latestEpisodeTitle: book.latestEpisodeTitle
  }));

  const episodeCount = books.reduce((sum, book) => sum + book.episodeCount, 0);
  const featuredBook = summaryBooks.find((book) => book.featured) ?? summaryBooks[0];
  const show = {
    ...baseShow,
    imageUrl: baseShow.imageUrl ?? featuredBook?.coverUrl,
    imageAbsoluteUrl: baseShow.imageAbsoluteUrl ?? featuredBook?.coverAbsoluteUrl,
    bookCount: summaryBooks.length,
    episodeCount
  };

  return {
    value: {
      show,
      featuredBook,
      books: summaryBooks
    } satisfies StoriesLibrary,
    books,
    showCoverFileName: coverFileName
  };
}

async function getStoriesCache(env: Env) {
  const now = Date.now();
  if (storiesCache && storiesCache.expiresAt > now) {
    return storiesCache;
  }

  const scanned = await scanStoriesLibrary(env);
  storiesCache = {
    ...scanned,
    expiresAt: now + STORIES_CACHE_TTL_MS
  };
  return storiesCache;
}

export async function getStoriesForHouse(env: Env) {
  return (await getStoriesCache(env)).value;
}

function renderFeed(library: StoriesLibrary, books: StoryBook[], selectedBook?: StoryBook) {
  const feedTitle = selectedBook ? `${library.show.title} - ${selectedBook.title}` : library.show.title;
  const feedDescription = selectedBook ? selectedBook.description : library.show.description;
  const feedLink = selectedBook ? selectedBook.pageAbsoluteUrl : library.show.pageAbsoluteUrl;
  const feedImage = selectedBook?.coverAbsoluteUrl ?? library.show.imageAbsoluteUrl;
  const selfUrl = selectedBook ? selectedBook.seasonFeedAbsoluteUrl : library.show.feedAbsoluteUrl;
  const items = (selectedBook ? [selectedBook] : books)
    .flatMap((book) =>
      book.episodes.map((episode) => ({
        book,
        episode
      }))
    )
    .sort(
      (left, right) =>
        new Date(right.episode.publishedAt).getTime() - new Date(left.episode.publishedAt).getTime() ||
        right.book.seasonNumber - left.book.seasonNumber ||
        right.episode.episodeNumber - left.episode.episodeNumber
    );

  const itemXml = items
    .map(({ book, episode }) => {
      const summary = escapeXml(episode.description || episode.summary || book.summary);
      const itemTitle = escapeXml(`${book.title} - ${episode.title}`);
      const author = escapeXml(book.author || library.show.author);
      const imageTag = book.coverAbsoluteUrl
        ? `\n      <itunes:image href="${escapeXml(book.coverAbsoluteUrl)}"/>`
        : '';

      return `    <item>
      <title>${itemTitle}</title>
      <description>${summary}</description>
      <itunes:summary>${summary}</itunes:summary>
      <link>${escapeXml(episode.pageAbsoluteUrl)}</link>
      <guid isPermaLink="false">${escapeXml(episode.pageAbsoluteUrl)}</guid>
      <pubDate>${new Date(episode.publishedAt).toUTCString()}</pubDate>
      <enclosure url="${escapeXml(episode.audioAbsoluteUrl)}" length="${episode.sizeBytes}" type="${escapeXml(episode.audioMimeType)}"/>
      <itunes:author>${author}</itunes:author>
      <itunes:season>${book.seasonNumber}</itunes:season>
      <itunes:episode>${episode.episodeNumber}</itunes:episode>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:explicit>false</itunes:explicit>${imageTag}
    </item>`;
    })
    .join('\n');

  const ownerXml = library.show.ownerEmail
    ? `\n    <itunes:owner>\n      <itunes:name>${escapeXml(library.show.ownerName)}</itunes:name>\n      <itunes:email>${escapeXml(library.show.ownerEmail)}</itunes:email>\n    </itunes:owner>`
    : '';

  const imageXml = feedImage ? `\n    <itunes:image href="${escapeXml(feedImage)}"/>` : '';
  const subtitleXml = library.show.subtitle
    ? `\n    <itunes:subtitle>${escapeXml(library.show.subtitle)}</itunes:subtitle>`
    : '';
  const summary = escapeXml(feedDescription);

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${escapeXml(feedLink)}</link>
    <description>${summary}</description>
    <language>${escapeXml(library.show.language)}</language>
    <atom:link href="${escapeXml(selfUrl)}" rel="self" type="application/rss+xml"/>
    <itunes:author>${escapeXml(library.show.author)}</itunes:author>
    <itunes:summary>${summary}</itunes:summary>${subtitleXml}
    <itunes:type>serial</itunes:type>
    <itunes:explicit>false</itunes:explicit>${ownerXml}${imageXml}
${itemXml}
  </channel>
</rss>
`;
}

export async function registerStoriesRoutes(app: FastifyInstance, env: Env) {
  app.get('/api/stories', async (_req, reply) => {
    const cache = await getStoriesCache(env);
    reply.header('cache-control', 'no-store');
    return cache.value;
  });

  app.get('/api/stories/:slug', async (req, reply) => {
    const params = req.params as { slug: string };
    const cache = await getStoriesCache(env);
    const book = cache.books.find((item) => item.slug === params.slug);
    if (!book) {
      return reply.code(404).send({ error: 'Story not found' });
    }

    const response: StoriesDetailResponse = {
      show: cache.value.show,
      book: {
        slug: book.slug,
        title: book.title,
        subtitle: book.subtitle,
        author: book.author,
        summary: book.summary,
        description: book.description,
        seasonNumber: book.seasonNumber,
        featured: book.featured,
        coverUrl: book.coverUrl,
        coverAbsoluteUrl: book.coverAbsoluteUrl,
        purchaseUrl: book.purchaseUrl,
        purchaseLabel: book.purchaseLabel,
        pageUrl: book.pageUrl,
        pageAbsoluteUrl: book.pageAbsoluteUrl,
        seasonFeedUrl: book.seasonFeedUrl,
        seasonFeedAbsoluteUrl: book.seasonFeedAbsoluteUrl,
        episodeCount: book.episodeCount,
        latestEpisodePublishedAt: book.latestEpisodePublishedAt,
        latestEpisodeTitle: book.latestEpisodeTitle,
        episodes: book.episodes
      }
    };

    reply.header('cache-control', 'no-store');
    return response;
  });

  app.get(STORIES_FEED_PATH, async (_req, reply) => {
    const cache = await getStoriesCache(env);
    reply.header('content-type', 'application/rss+xml; charset=utf-8');
    reply.header('cache-control', 'public, max-age=60, must-revalidate');
    return renderFeed(cache.value, cache.books);
  });

  app.get(`${STORIES_FEED_PATH.replace(/\.xml$/i, '')}/:slug.xml`, async (req, reply) => {
    const params = req.params as { slug: string };
    const cache = await getStoriesCache(env);
    const book = cache.books.find((item) => item.slug === params.slug);
    if (!book) {
      return reply.code(404).send({ error: 'Story not found' });
    }

    reply.header('content-type', 'application/rss+xml; charset=utf-8');
    reply.header('cache-control', 'public, max-age=60, must-revalidate');
    return renderFeed(cache.value, cache.books, book);
  });

  app.get(`${normalizePathname(STORIES_MEDIA_PATH)}/show/:fileName`, async (req, reply) => {
    const params = req.params as { fileName: string };
    const fileName = path.basename(params.fileName);
    const cache = await getStoriesCache(env);

    if (!cache.showCoverFileName || cache.showCoverFileName !== fileName) {
      return reply.code(404).send({ error: 'Story media not found' });
    }

    const mimeType = getMimeType(fileName);
    if (mimeType) {
      reply.type(mimeType);
    }
    reply.header('cache-control', 'public, max-age=3600');
    return reply.sendFile(fileName, env.BEDTIME_STORIES_ROOT);
  });

  app.get(`${normalizePathname(STORIES_MEDIA_PATH)}/:slug/:fileName`, async (req, reply) => {
    const params = req.params as { slug: string; fileName: string };
    const cache = await getStoriesCache(env);
    const book = cache.books.find((item) => item.slug === params.slug);
    const fileName = path.basename(params.fileName);

    if (!book || !book.files.has(fileName)) {
      return reply.code(404).send({ error: 'Story media not found' });
    }

    const mimeType = getMimeType(fileName);
    if (!mimeType) {
      return reply.code(404).send({ error: 'Story media not found' });
    }

    reply.type(mimeType);
    reply.header('cache-control', 'public, max-age=3600');
    return reply.sendFile(path.join(book.folderName, fileName), env.BEDTIME_STORIES_ROOT);
  });
}
