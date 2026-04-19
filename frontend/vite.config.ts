// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    // selfDestroying: 기존에 등록된 서비스워커를 자동으로 해제하고 이후 재등록하지 않음
    // 배포마다 캐시가 꼬이는 문제를 근본적으로 해결
    VitePWA({
      selfDestroying: true,
    }),
  ],
  resolve: {
    alias: {
      // @shared/types → 루트의 shared/types.ts
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
})
