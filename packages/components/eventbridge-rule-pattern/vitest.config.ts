import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { resolve } from 'path';

export default defineConfig({
  plugins: [nxViteTsPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    testTimeout: 30000, // 30 seconds per test
    hookTimeout: 10000, // 10 seconds for hooks
    teardownTimeout: 10000, // 10 seconds for teardown
    watch: false, // Explicitly disable watch mode to ensure clean exit
    globalTeardown: resolve(__dirname, 'tests/global-teardown.ts'),
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts'],
    },
  },
  resolve: {
    // Vitest natively respects package.json exports including 'development' condition
    // No moduleNameMapper needed!
  },
});




