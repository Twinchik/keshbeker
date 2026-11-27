import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/{unit,integration}/**/*.test.mjs'],
    coverage: {
      provider: 'v8',
      include: ['js/{data,scan,shops}.js'],
      reporter: ['text', 'html', 'lcov'],
    },
  },
});
