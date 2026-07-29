import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      localsConvention: 'dashes',
    },
  },
  server: {
    port: Number(process.env.PORT) || 5174,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'flow-vendor': ['reactflow', 'dagre'],
          'query-vendor': ['@tanstack/react-query'],
          'http-vendor': ['axios'],
        },
      },
    },
  },
  envPrefix: ['VITE_'],
})
