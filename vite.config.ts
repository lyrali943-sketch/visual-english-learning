import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

import { createAiApiMiddleware } from './server/ai-handler.mjs'

/**
 * Mounts the same secure AI API used in production during `vite dev`,
 * so the frontend can always call same-origin /api/* endpoints.
 */
function vesAiApi(): Plugin {
  return {
    name: 'ves-ai-api',
    configureServer(server) {
      server.middlewares.use(createAiApiMiddleware())
    },
    configurePreviewServer(server) {
      server.middlewares.use(createAiApiMiddleware())
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), vesAiApi()],
  server: {
    port: 5173,
  },
})
