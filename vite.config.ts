import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'mmemory',
        short_name: 'mmemory',
        description: '두 멤버의 활동을 시간순으로 아카이빙하는 팬 커뮤니티 플랫폼',
        theme_color: '#88C9F9',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'ko',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallbackDenylist: [/^\/admin/, /^\/api/],
        // 이전 배포의 precache를 지운다. 안 지우면 낡은 셸이 계속 남는다.
        cleanupOutdatedCaches: true,
        // /assets/* 에 runtimeCaching(CacheFirst, maxEntries 100)을 걸지 않는다.
        // 해시가 박힌 불변 파일이라 이미 precache에 들어가는데, 거기에 CacheFirst를 또 얹으면
        // 배포가 쌓일수록 LRU로 옛 청크가 밀려난다. 그 상태에서 낡은 index.html이 사라진 청크를
        // 요청하면 vercel.json의 SPA 폴백이 index.html(HTML)을 200으로 돌려주고,
        // 모듈 로드가 깨져 화면이 에러 폴백으로 떨어진다. (2026-09-18 실제 장애)
      },
    }),
  ],
  define: {
    global: 'globalThis',
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    rollupOptions: {
      output: {
        // AWS SDK는 admin 전용(r2Upload)이라 vendor 청크로 고정하지 않는다.
        // 고정하면 vite preload 헬퍼가 그 청크에 얹혀 entry가 SDK 전체를 static import하게 된다.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild',
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  server: {
    port: 3000,
  },
})
