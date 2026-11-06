import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/shuffleboard2000/',
  build: { chunkSizeWarningLimit: 900 },
  test: { include: ['tests/**/*.test.ts'] },
});
