import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      'server-only': path.resolve(__dirname, 'src/lib/__tests__/server-only-stub.ts'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
