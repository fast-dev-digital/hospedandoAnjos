import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // injeta env vars fake antes de importar config/env.ts (que usa required()).
    setupFiles: ['./src/test-setup.ts'],
  },
});
