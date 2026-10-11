import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { loadEnv } from './env.js';
import { resetMrRassySoundsCache } from './mrRassySounds.js';

const instances: { close: () => Promise<void> }[] = [];
const tempDirs: string[] = [];

afterEach(async () => {
  for (const app of instances.splice(0)) {
    await app.close();
  }

  resetMrRassySoundsCache();

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
  const dir = createTempDir('rasies-sounds-web-dist-');
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html><body>sounds</body></html>');
  return dir;
}

function createSoundsFixture() {
  const root = createTempDir('rasies-sounds-root-');
  fs.writeFileSync(path.join(root, 'station-id.mp3'), 'station-one');
  fs.writeFileSync(path.join(root, 'transition-bell.wav'), 'station-two');
  return root;
}

type SoundsResponse = {
  count: number;
  sounds: Array<{ url: string }>;
};

describe('mr rassy sounds', () => {
  it('lists synced sound files for later use', async () => {
    const env = {
      ...loadEnv(),
      MR_RASSY_SOUNDS_ROOT: createSoundsFixture()
    };

    const app = await createApp(env, { webDistRoot: createTempWebDist() });
    instances.push(app);

    const res = await app.inject({ method: 'GET', url: '/api/mr-rassy/sounds' });
    expect(res.statusCode).toBe(200);

    const body = res.json() as SoundsResponse;
    expect(body.count).toBe(2);
    expect(body.sounds[0].url).toMatch(/^\/mr-rassy-sounds-media\//);
  });

  it('serves synced sound files from the media route', async () => {
    const env = {
      ...loadEnv(),
      MR_RASSY_SOUNDS_ROOT: createSoundsFixture()
    };

    const app = await createApp(env, { webDistRoot: createTempWebDist() });
    instances.push(app);

    const res = await app.inject({
      method: 'GET',
      url: '/mr-rassy-sounds-media/station-id.mp3'
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('audio/mpeg');
    expect(res.body).toContain('station-one');
  });
});
