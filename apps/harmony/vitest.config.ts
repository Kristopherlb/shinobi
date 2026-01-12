import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  plugins: [nxViteTsPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{js,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,ts,tsx}'],
      exclude: ['src/**/*.d.ts'],
    },
  },
  resolve: {
    // Vitest natively respects package.json exports including 'development' condition
    // No moduleNameMapper needed!
  },
});
