import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { loadEnv } from './env.js';
import type { MusicLibraryResponse } from './musicLibrary.js';

const instances: { close: () => Promise<void> }[] = [];
const tempDirs: string[] = [];

afterEach(async () => {
  for (const app of instances.splice(0)) {
    await app.close();
  }

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
  const dir = createTempDir('rasies-music-web-dist-');
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html><body>music</body></html>');
  return dir;
}

function createMusicFixture() {
  const root = createTempDir('rasies-music-root-');
  const artists = path.join(root, 'Artists');
  const neil = path.join(artists, 'Neil Young');
  fs.mkdirSync(neil, { recursive: true });
  fs.writeFileSync(path.join(neil, '01 - Heart of Gold.mp3'), 'gold');
  fs.writeFileSync(path.join(neil, '02 - Old Man.flac'), 'old-man');
  fs.writeFileSync(path.join(neil, 'notes.txt'), 'ignore-me');
  return root;
}

describe('music library', () => {
  it('lists folders from the mounted music root', async () => {
    const env = {
      ...loadEnv(),
      MUSIC_LIBRARY_ROOT: createMusicFixture()
    };

    const app = await createApp(env, { webDistRoot: createTempWebDist() });
    instances.push(app);

    const res = await app.inject({ method: 'GET', url: '/api/music-library' });
    expect(res.statusCode).toBe(200);

    const body = res.json() as MusicLibraryResponse;
    expect(body.available).toBe(true);
    expect(body.directories[0].name).toBe('Artists');
    expect(body.tracks).toHaveLength(0);
  });

  it('lists playable tracks inside a music folder', async () => {
    const env = {
      ...loadEnv(),
      MUSIC_LIBRARY_ROOT: createMusicFixture()
    };

    const app = await createApp(env, { webDistRoot: createTempWebDist() });
    instances.push(app);

    const res = await app.inject({
      method: 'GET',
      url: '/api/music-library?path=Artists%2FNeil%20Young'
    });
    expect(res.statusCode).toBe(200);

    const body = res.json() as MusicLibraryResponse;
    expect(body.tracks).toHaveLength(2);
    expect(body.tracks[0].title).toBe('Heart Of Gold');
    expect(body.tracks[0].url).toContain('/music-library-media/Artists/Neil%20Young/');
  });

  it('serves music files from the media route', async () => {
    const env = {
      ...loadEnv(),
      MUSIC_LIBRARY_ROOT: createMusicFixture()
    };

    const app = await createApp(env, { webDistRoot: createTempWebDist() });
    instances.push(app);

    const res = await app.inject({
      method: 'GET',
      url: '/music-library-media/Artists/Neil%20Young/01%20-%20Heart%20of%20Gold.mp3'
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('audio/mpeg');
    expect(res.body).toContain('gold');
  });
});
