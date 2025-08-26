import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // No includeAssets (you said you don't have any yet)
      manifest: {
        name: 'Climbge',
        short_name: 'Climbge',
        description: 'Log climbs, track attempts & sends.',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        theme_color: '#e97316',
        background_color: '#e97316',
        // icons: [] // add 192x192 + 512x512 (maskable) later
      },
      workbox: {
        navigateFallback: '/index.html',
        // Do NOT cache your separate API origin
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.climbge\.com\/.*$/i,
            handler: 'NetworkOnly',
            method: 'GET',
          },
          {
            urlPattern: /^https:\/\/api\.climbge\.com\/.*$/i,
            handler: 'NetworkOnly',
            method: 'POST',
          },
        ],
      },
      // helpful while wiring things up locally
      devOptions: { enabled: true },
    }),
  ],
})
