import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'
import fs from 'fs'

// Electron preload scripts must be CommonJS (Electron loads them via require())
// even though the project is type:module. vite-plugin-electron defaults to ESM
// when package.json has "type": "module", so we force CJS for the preload
// entry and clean up the orphan ESM build that vite emits due to mergeConfig's
// array-concat behavior on lib.formats.

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['better-sqlite3'],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            lib: {
              entry: 'electron/preload.ts',
              formats: ['cjs'],
              fileName: (format: string) =>
                format === 'cjs' ? 'preload.cjs' : `preload-${format}.js`,
            },
          },
          plugins: [
            {
              name: 'voicehub:cleanup-preload-orphans',
              closeBundle() {
                const orphan = path.resolve('dist-electron/preload-es.js')
                if (fs.existsSync(orphan)) fs.unlinkSync(orphan)
              },
            },
          ],
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
