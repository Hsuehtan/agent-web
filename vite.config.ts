import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import type { ProxyOptions } from 'vite'
import { resolve } from 'path'
import pkg from './package.json'
import oemConfig from './oem.config'

const BACKEND = 'http://127.0.0.1:8648'

/**
 * Vite plugin to inject OEM config values into index.html at build time,
 * so that the initial <title> and favicon reflect the brand before JS loads.
 */
function oemIndexHtmlPlugin(): Plugin {
  return {
    name: 'oem-index-html',
    transformIndexHtml(html: string) {
      return html
        .replace(/<title>[^<]*<\/title>/, `<title>${oemConfig.brand.pageTitle}</title>`)
        .replace(
          /<link[^>]*rel=["'][^"']*icon[^"']*["'][^>]*>/,
          `<link rel="icon" type="image/svg+xml" href="${oemConfig.brand.faviconPath}" />`,
        )
    },
  }
}

function createProxyConfig(): ProxyOptions {
  return {
    target: BACKEND,
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.removeHeader('origin')
        proxyReq.removeHeader('referer')
      })
      proxy.on('proxyRes', (proxyRes) => {
        proxyRes.headers['cache-control'] = 'no-cache'
        proxyRes.headers['x-accel-buffering'] = 'no'
      })
    },
  }
}

export default defineConfig({
  root: 'packages/client',
  plugins: [vue(), oemIndexHtmlPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'packages/client/src'),
      '@oem-config': resolve(__dirname, 'oem.config'),
    },
  },
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
    // Use esbuild for minification (much faster than terser)
    minify: 'esbuild',
    // Disable sourcemap generation for faster builds
    sourcemap: false,
    target: 'es2020',
    // Increase chunk size warning limit (default: 500KB)
    chunkSizeWarningLimit: 1000,
    // CSS code splitting for better caching
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Manual chunk splitting to speed up rendering
        manualChunks(id) {
          // Separate large heavy packages to avoid blocking other chunks
          if (id.includes('node_modules/monaco-editor')) {
            return 'monaco-editor'
          }
          if (id.includes('node_modules/mermaid')) {
            return 'mermaid'
          }
          if (id.includes('node_modules/@xterm')) {
            return 'xterm'
          }
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
              return 'vue-vendor'
            }
            if (id.includes('naive-ui')) {
              return 'ui-vendor'
            }
            return 'vendor'
          }
        },
        // Optimize chunk file names for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },
  optimizeDeps: {
    // Pre-bundle all large dependencies for faster builds
    include: [
      'monaco-editor',
      'mermaid',
      'vue',
      'vue-router',
      'pinia',
      'naive-ui',
    ],
  },
  server: {
    proxy: {
      '/api': createProxyConfig(),
      '/v1': createProxyConfig(),
      '/health': createProxyConfig(),
      '/upload': createProxyConfig(),
      '/webhook': createProxyConfig(),
      '/socket.io': {
        target: BACKEND,
        ws: true,
      },
    },
  },
})
