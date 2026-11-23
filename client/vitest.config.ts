import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['node_modules', 'dist'],
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})