import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon.svg', 'manifest.json'],
      manifest: {
        short_name: 'ترازینو',
        name: 'ترازینو (Tarazino) | مدیریت هوشمند سبد سرمایه‌گذاری',
        icons: [
          {
            src: '/icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        start_url: './',
        background_color: '#0B0F17',
        theme_color: '#D4AF37',
        display: 'standalone',
        orientation: 'portrait',
        dir: 'rtl',
        lang: 'fa-IR',
        description: 'برنامه هوشمند محاسبه تخصیص پس‌انداز و خرید طلا و ارزهای دیجیتال'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    proxy: {
      '/api/tsetmc': {
        target: 'https://cdn.tsetmc.com/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tsetmc/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://tsetmc.com/',
          'Accept': 'application/json, text/plain, */*',
        }
      },
      '/api/nobitex': {
        target: 'https://apiv2.nobitex.ir',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nobitex/, ''),
        headers: {
          'User-Agent': 'TraderBot/InvestmentApp-1.0.0',
          'Accept': 'application/json, text/plain, */*',
        }
      },
      '/api/tgju': {
        target: 'https://call5.tgju.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tgju/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://www.tgju.org/',
          'Accept': 'application/json, text/plain, */*',
        }
      }
    }
  }
});
