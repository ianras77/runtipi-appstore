import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { loadEnv } from './env.js';
import { resetThoughtsCache } from './thoughts.js';

const instances: { close: () => Promise<void> }[] = [];
const tempDirs: string[] = [];

afterEach(async () => {
  for (const app of instances.splice(0)) {
    await app.close();
  }

  resetThoughtsCache();

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
  const dir = createTempDir('rasies-thoughts-web-dist-');
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html><body>thoughts</body></html>');
  return dir;
}

function createThoughtsFixture() {
  const root = createTempDir('rasies-thoughts-root-');

  fs.writeFileSync(
    path.join(root, '2026-03-18-sunrise-notes.md'),
    `---
title: Sunrise Notes
summary: A warm note about making useful things with care.
publishedAt: 2026-03-18
featured: true
tags:
  - family
  - build
---
# Sunrise Notes

I want this site to feel hosted, not rented.

That means every corner should feel personal and easy to keep alive.
`
  );

  fs.mkdirSync(path.join(root, 'garden'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'garden', 'garden-log.markdown'),
    `---
title: Garden Log
slug: garden-log
publishedAt: 2026-03-17
---
The tomatoes are finally behaving and the basil is starting to feel ambitious.
`
  );

  fs.mkdirSync(path.join(root, 'images'), { recursive: true });
  fs.writeFileSync(path.join(root, 'images', 'sunrise.png'), 'sunrise-media');
  fs.writeFileSync(path.join(root, 'images', '.secret.txt'), 'hidden');
  fs.writeFileSync(path.join(root, 'draft.json'), '{"secret":true}');

  return root;
}

type ThoughtsListResponse = {
  featuredThought: {
    slug: string;
  };
  thoughts: Array<{
    slug: string;
    title: string;
    tags: string[];
    readingMinutes: number;
  }>;
};

type ThoughtDetailResponse = {
  thought: {
    title: string;
    pageAbsoluteUrl: string;
    content: string;
  };
};

describe('thoughts', () => {
  it('lists markdown thoughts with featured ordering and front matter', async () => {
    const env = {
      ...loadEnv(),
      PUBLIC_BASE_URL: 'https://www.rasies.com',
      THOUGHTS_ROOT: createThoughtsFixture()
    };

    const app = await createApp(env, { webDistRoot: createTempWebDist() });
    instances.push(app);

    const res = await app.inject({ method: 'GET', url: '/api/thoughts' });
    expect(res.statusCode).toBe(200);

    const body = res.json() as ThoughtsListResponse;
    expect(body.featuredThought.slug).toBe('sunrise-notes');
    expect(body.thoughts).toHaveLength(2);
    expect(body.thoughts[0].title).toBe('Sunrise Notes');
    expect(body.thoughts[0].tags).toEqual(['family', 'build']);
    expect(body.thoughts[0].readingMinutes).toBeGreaterThanOrEqual(1);
    expect(body.thoughts[1].slug).toBe('garden-log');
  });

  it('returns a single markdown thought payload', async () => {
    const env = {
      ...loadEnv(),
      PUBLIC_BASE_URL: 'https://www.rasies.com',
      THOUGHTS_ROOT: createThoughtsFixture()
    };

    const app = await createApp(env, { webDistRoot: createTempWebDist() });
    instances.push(app);

    const res = await app.inject({ method: 'GET', url: '/api/thoughts/sunrise-notes' });
    expect(res.statusCode).toBe(200);

    const body = res.json() as ThoughtDetailResponse;
    expect(body.thought.title).toBe('Sunrise Notes');
    expect(body.thought.pageAbsoluteUrl).toBe('https://www.rasies.com/thoughts/sunrise-notes');
    expect(body.thought.content).toContain('hosted, not rented');
  });

  it('serves synced thought assets from the media route', async () => {
    const env = {
      ...loadEnv(),
      PUBLIC_BASE_URL: 'https://www.rasies.com',
      THOUGHTS_ROOT: createThoughtsFixture()
    };

    const app = await createApp(env, { webDistRoot: createTempWebDist() });
    instances.push(app);

    const res = await app.inject({ method: 'GET', url: '/thoughts-media/images/sunrise.png' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
    expect(res.body).toContain('sunrise-media');
  });

  it('does not expose markdown sources, dotfiles, or JSON through the media route', async () => {
    const env = {
      ...loadEnv(),
      PUBLIC_BASE_URL: 'https://www.rasies.com',
      THOUGHTS_ROOT: createThoughtsFixture()
    };

    const app = await createApp(env, { webDistRoot: createTempWebDist() });
    instances.push(app);

    const markdownRes = await app.inject({
      method: 'GET',
      url: '/thoughts-media/2026-03-18-sunrise-notes.md'
    });
    expect(markdownRes.statusCode).toBe(404);

    const hiddenRes = await app.inject({
      method: 'GET',
      url: '/thoughts-media/images/.secret.txt'
    });
    expect(hiddenRes.statusCode).toBe(404);

    const jsonRes = await app.inject({
      method: 'GET',
      url: '/thoughts-media/draft.json'
    });
    expect(jsonRes.statusCode).toBe(404);
  });
});
