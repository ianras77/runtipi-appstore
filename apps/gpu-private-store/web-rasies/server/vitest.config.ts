import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '/tmp/web-rasies-server-vite',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
});
