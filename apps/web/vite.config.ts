import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  envDir: '../../',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['cisne222.png'],
      manifest: {
        name: 'Clube Ser Cisne',
        short_name: 'Ser Cisne',
        description: 'Sistema de Gestão do Clube Ser Cisne',
        theme_color: '#0A3D62',
        background_color: '#F5F7FA',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        icons: [
          {
            src: 'cisne222.png',
            sizes: '1200x1200',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'cisne222.png',
            sizes: '1200x1200',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3333',
        changeOrigin: true,
      },
    },
  },
})
