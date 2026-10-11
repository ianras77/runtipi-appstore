import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { loadEnv } from './env.js';
import { resetStoriesCache } from './stories.js';

const instances: { close: () => Promise<void> }[] = [];
const tempDirs: string[] = [];

afterEach(async () => {
  for (const app of instances.splice(0)) {
    await app.close();
  }

  resetStoriesCache();

  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function createTempDir(prefix: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function createTempWebDist() {
  const dir = createTempDir('rasies-stories-web-dist-');
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html><body>stories</body></html>');
  return dir;
}

function createStoriesFixture() {
  const root = createTempDir('rasies-stories-root-');
  fs.writeFileSync(
    path.join(root, 'podcast.json'),
    JSON.stringify({
      title: 'Real Life Bedtime Stories',
      subtitle: 'A tiny shelf of books for my daughter.',
      description: 'Bedtime stories read with heart.',
      ownerEmail: 'stories@example.com'
    })
  );
  fs.writeFileSync(path.join(root, 'podcast-cover.jpg'), 'cover');

  const goodnightMoon = path.join(root, 'goodnight-moon');
  fs.mkdirSync(goodnightMoon);
  fs.writeFileSync(
    path.join(goodnightMoon, 'book.json'),
    JSON.stringify({
      title: 'Goodnight Moon',
      author: 'Margaret Wise Brown',
      summary: 'A soft, familiar bedtime classic.',
      featured: true,
      amazonAsin: '0064430170'
    })
  );
  fs.writeFileSync(path.join(goodnightMoon, 'cover.jpg'), 'book-cover');
  fs.writeFileSync(path.join(goodnightMoon, '01 - In the great green room.mp3'), 'audio-one');
  fs.writeFileSync(path.join(goodnightMoon, '02 - Goodnight noises everywhere.m4a'), 'audio-two');
  fs.writeFileSync(
    path.join(goodnightMoon, '02 - Goodnight noises everywhere.json'),
    JSON.stringify({
      title: 'Goodnight noises everywhere',
      description: 'The room settles and the story softens into sleep.',
      publishedAt: 'not-a-date'
    })
  );

  const frogAndToad = path.join(root, 'frog-and-toad');
  fs.mkdirSync(frogAndToad);
  fs.writeFileSync(
    path.join(frogAndToad, 'book.json'),
    JSON.stringify({
      title: 'Frog and Toad',
      summary: 'Small adventures and good friendship.',
      season: 2
    })
  );
  fs.writeFileSync(path.join(frogAndToad, '01 - Spring is here.mp3'), 'audio-three');

  return root;
}

type StoriesListResponse = {
  show: {
    title: string;
    feedUrl: string;
    bookCount: number;
  };
  featuredBook: {
    slug: string;
    purchaseUrl?: string;
  };
  books: Array<{
    coverUrl?: string;
  }>;
};

type StoriesDetailResponse = {
  book: {
    title: string;
    episodeCount: number;
    episodes: Array<{
      title: string;
      publishedAt: string;
    }>;
    seasonFeedUrl: string;
  };
};

describe('stories', () => {
  it('lists the library with featured books and feed urls', async () => {
    const env = {
      ...loadEnv(),
      PUBLIC_BASE_URL: 'https://www.rasies.com',
      BEDTIME_STORIES_ROOT: createStoriesFixture(),
      BEDTIME_STORIES_AMAZON_TAG: 'rasies-20'
    };

    const app = await createApp(env, { webDistRoot: createTempWebDist() });
    instances.push(app);

    const res = await app.inject({ method: 'GET', url: '/api/stories' });
    expect(res.statusCode).toBe(200);

    const body = res.json() as StoriesListResponse;
    expect(body.show.title).toBe('Real Life Bedtime Stories');
    expect(body.show.feedUrl).toBe('/podcast/real-life-bedtime-stories.xml');
    expect(body.show.bookCount).toBe(2);
    expect(body.featuredBook.slug).toBe('goodnight-moon');
    expect(body.featuredBook.purchaseUrl).toContain('tag=rasies-20');
    expect(body.books[0].coverUrl).toBe('/stories-media/goodnight-moon/cover.jpg');
  });

  it('returns a book detail page payload with ordered episodes', async () => {
    const env = {
      ...loadEnv(),
      PUBLIC_BASE_URL: 'https://www.rasies.com',
      BEDTIME_STORIES_ROOT: createStoriesFixture()
    };

    const app = await createApp(env, { webDistRoot: createTempWebDist() });
    instances.push(app);

    const res = await app.inject({ method: 'GET', url: '/api/stories/goodnight-moon' });
    expect(res.statusCode).toBe(200);

    const body = res.json() as StoriesDetailResponse;
    expect(body.book.title).toBe('Goodnight Moon');
    expect(body.book.episodeCount).toBe(2);
    expect(body.book.episodes[0].title).toBe('In The Great Green Room');
    expect(body.book.episodes[1].title).toBe('Goodnight noises everywhere');
    expect(body.book.episodes[1].publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.book.seasonFeedUrl).toBe('/podcast/real-life-bedtime-stories/goodnight-moon.xml');
  });

  it('publishes a podcast feed with enclosure tags', async () => {
    const env = {
      ...loadEnv(),
      PUBLIC_BASE_URL: 'https://www.rasies.com',
      BEDTIME_STORIES_ROOT: createStoriesFixture()
    };

    const app = await createApp(env, { webDistRoot: createTempWebDist() });
    instances.push(app);

    const res = await app.inject({
      method: 'GET',
      url: '/podcast/real-life-bedtime-stories.xml'
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/rss+xml');
    expect(res.body).toContain('<itunes:season>1</itunes:season>');
    expect(res.body).toContain('https://www.rasies.com/bedtime-stories/goodnight-moon#in-the-great-green-room');
    expect(res.body).toContain('https://www.rasies.com/stories-media/goodnight-moon/01%20-%20In%20the%20great%20green%20room.mp3');
  });

  it('serves story audio through the media route', async () => {
    const env = {
      ...loadEnv(),
      PUBLIC_BASE_URL: 'https://www.rasies.com',
      BEDTIME_STORIES_ROOT: createStoriesFixture()
    };

    const app = await createApp(env, { webDistRoot: createTempWebDist() });
    instances.push(app);

    const res = await app.inject({
      method: 'GET',
      url: '/stories-media/goodnight-moon/01%20-%20In%20the%20great%20green%20room.mp3'
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('audio/mpeg');
    expect(res.body).toContain('audio-one');
  });
});
