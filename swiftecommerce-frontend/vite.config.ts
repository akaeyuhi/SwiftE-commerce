import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
/* eslint-disable camelcase */

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],

      manifest: {
        name: 'SwiftE-commerce',
        short_name: 'SwiftE',
        description: 'Modern e-commerce platform with AI-powered features',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',

        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],

        screenshots: [
          {
            src: '/screenshots/desktop-1.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
          },
          {
            src: '/screenshots/mobile-1.png',
            sizes: '750x1334',
            type: 'image/png',
            form_factor: 'narrow',
          },
        ],

        categories: ['shopping', 'business'],

        shortcuts: [
          {
            name: 'Products',
            short_name: 'Products',
            description: 'Browse products',
            url: '/products',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
          },
          {
            name: 'Cart',
            short_name: 'Cart',
            description: 'View shopping cart',
            url: '/cart',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
          },
          {
            name: 'Orders',
            short_name: 'Orders',
            description: 'View your orders',
            url: '/orders',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
          },
        ],
      },

      workbox: {
        // Cache strategy
        runtimeCaching: [
          // Cache API calls
          {
            urlPattern: /^https:\/\/api\.swiftecommerce\.com\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          // Cache images
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },

          // Cache fonts
          {
            urlPattern: /\.(woff|woff2|ttf|otf)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
            },
          },

          // Cache Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
            },
          },

          // Cache CSS and JS
          {
            urlPattern: /\.(css|js)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],

        // Clean up old caches
        cleanupOutdatedCaches: true,

        // Skip waiting and claim clients
        skipWaiting: true,
        clientsClaim: true,

        // Navigation fallback
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /\.(png|jpg|jpeg|svg|gif)$/],
      },

      devOptions: {
        enabled: true, // Enable PWA in dev mode for testing
        type: 'module',
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
