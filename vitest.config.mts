import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    // Node, not jsdom. Payload's upload pipeline validates the file buffer's
    // type signature, and under jsdom the Buffer crosses realms so
    // `fileTypeFromBuffer` throws and every upload is rejected as invalid.
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
    // Every spec file boots its own Payload instance, and each boot runs
    // `pushDevSchema` against the same database. In parallel they race to
    // CREATE TYPE the same enums and one loses with a duplicate-key error.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
})
