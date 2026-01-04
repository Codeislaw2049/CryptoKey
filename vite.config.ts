import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  root: '.',
  plugins: [
    react(), 
    wasm(), 
    topLevelAwait(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'CryptoKey IM',
        short_name: 'CryptoKey',
        description: 'Secure, offline-capable encryption and decryption tool',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,json}'],
        runtimeCaching: [
            {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
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
                    maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
            }
        ]
      }
    }),
    // CSP Injection Plugin
    {
      name: 'inject-csp',
      transformIndexHtml(html) {
        const csp = process.env.NODE_ENV === 'production'
              ? "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data:; connect-src 'self' https://www.gutenberg.org https://api.cryptokey.im; worker-src 'self' blob:;"
              : "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:8097 https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data:; connect-src 'self' https://www.gutenberg.org https://api.cryptokey.im https://api.cryptokey.im   https://api.cryptokey.im; worker-src 'self' blob:;";

        return html.replace(
          /<meta http-equiv="Content-Security-Policy"[^>]*>/,
          `<meta http-equiv="Content-Security-Policy" content="${csp}">`
        );
      },
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'path': 'path-browserify',
      'lzma': path.resolve(__dirname, './src/vendor/lzma-wrapper.js'),
    },
  },
  server: {
    port: 1616,
    strictPort: true,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/index_zh.html') {
          // Serve index_zh.html - handled by Vite default usually, but good to have placeholder
        }
        
        if (req.url.startsWith('/api/')) {
          console.log(`[Mock API] ${req.method} ${req.url}`);
          
          res.setHeader('Content-Type', 'application/json');
          
          if (req.url === '/api/register' && req.method === 'POST') {
             // Mock Register
             res.end(JSON.stringify({ 
               success: true, 
               message: 'Mock Verification code sent',
               debugCode: '123456' // For local dev
             }));
             return;
          }
          
          if (req.url === '/api/login' && req.method === 'POST') {
             // Mock Login
             let body = '';
             req.on('data', chunk => body += chunk);
             req.on('end', () => {
                 const data = JSON.parse(body);
                 if (data.totpCode === '123456') {
                     res.end(JSON.stringify({
                        success: true,
                        token: 'mock-session-token-' + Date.now(),
                        user: { email: data.email, plan: 'free', device_fingerprint: 'mock-fp' }
                     }));
                 } else {
                     res.statusCode = 400;
                     res.end(JSON.stringify({ error: 'Invalid Code (Use 123456)' }));
                 }
             });
             return;
          }
          
          if (req.url === '/api/get-license' && req.method === 'POST') {
              res.end(JSON.stringify({ success: true, license: { is_pro: false } }));
              return;
          }

          if (req.url === '/api/referral-info' && req.method === 'POST') {
             // Mock Referral Info
             // Drain body to prevent connection issues
             req.on('data', () => {});
             req.on('end', () => {
                 res.end(JSON.stringify({ 
                     success: true, 
                     data: { 
                         code: 'MOCK-REF', 
                         count: 0, 
                         pro: false, 
                         earned_hours: 0 
                     } 
                 }));
             });
             return;
          }

          // Default Mock Response for others
          res.end(JSON.stringify({ success: false, error: 'Mock API endpoint not implemented' }));
          return;
        }
        next();
      });
    }
  },
  build: {
    sourcemap: false, // 🔒 Security: Prevent leaking source code (.tsx) via source maps
    minify: 'terser', // 🔒 Security: Use stronger minification
    terserOptions: {
      compress: {
        drop_console: true, // 🔒 Security: Remove console logs in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        zh: path.resolve(__dirname, 'index_zh.html'),
      },
    },
  }
})
