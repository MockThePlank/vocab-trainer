import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Prefer the fixed test files to avoid running a corrupted legacy test file.
    include: ['tests/**/*.fixed.test.ts', 'tests/**/*.test.ts'],
    globals: true,
    passWithNoTests: false,
  },
});
