/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Absoluta: la app vive en la raíz del dominio y también en /old (la versión de trabajo).
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icono.svg', 'apple-touch-icon.png', 'og.png', 'robots.txt', 'sitemap.xml'],
      manifest: {
        name: 'Repaso energético',
        short_name: 'Repaso',
        description: 'Los ejercicios del taller de manejo de energía, paso a paso en 3D, con rutinas y respiraciones conscientes.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#07080d',
        theme_color: '#07080d',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        // PostHog (analítica) no va a la caché sin conexión: sin red no hay a dónde enviar, y quien no
        // se mide (p. ej. con «no rastrear») no lo descarga.
        globIgnores: ['**/posthog-*.js'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  // Las pruebas de choques recorren muchos instantes: con todas en paralelo pasan de los 5 s por defecto.
  test: {
    testTimeout: 60000,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three';
          if (id.includes('@react-three') || id.includes('postprocessing')) return 'r3f';
          if (id.includes('node_modules/posthog-js/') || id.includes('node_modules/@posthog/')) return 'posthog';
          return undefined;
        },
      },
    },
  },
});
