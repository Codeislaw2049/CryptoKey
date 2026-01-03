// vite.config.ts
import { defineConfig } from "file:///D:/TEST/app/app18/node_modules/vite/dist/node/index.js";
import react from "file:///D:/TEST/app/app18/node_modules/@vitejs/plugin-react/dist/index.js";
import wasm from "file:///D:/TEST/app/app18/node_modules/vite-plugin-wasm/exports/import.mjs";
import topLevelAwait from "file:///D:/TEST/app/app18/node_modules/vite-plugin-top-level-await/exports/import.mjs";
import { VitePWA } from "file:///D:/TEST/app/app18/node_modules/vite-plugin-pwa/dist/index.js";
import path from "path";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///D:/TEST/app/app18/vite.config.ts";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig({
  root: ".",
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "CryptoKey IM",
        short_name: "CryptoKey",
        description: "Secure, offline-capable encryption and decryption tool",
        theme_color: "#ffffff",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm,json}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
                // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
                // <== 365 days
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
      name: "inject-csp",
      transformIndexHtml(html) {
        const csp = process.env.NODE_ENV === "production" ? "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data:; connect-src 'self' https://www.gutenberg.org https://cryptokey-auth.c-2049.workers.dev; worker-src 'self' blob:;" : "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:8097 https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data:; connect-src 'self' https://www.gutenberg.org http://localhost:8787 http://127.0.0.1:8787 ws://localhost:8787 ws://127.0.0.1:8787 https://cryptokey-auth.c-2049.workers.dev; worker-src 'self' blob:;";
        return html.replace(
          /<meta http-equiv="Content-Security-Policy"[^>]*>/,
          `<meta http-equiv="Content-Security-Policy" content="${csp}">`
        );
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "path": "path-browserify",
      "lzma": path.resolve(__dirname, "./src/vendor/lzma-wrapper.js")
    }
  },
  server: {
    port: 1616,
    strictPort: true,
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/index_zh.html") {
        }
        if (req.url.startsWith("/api/")) {
          console.log(`[Mock API] ${req.method} ${req.url}`);
          res.setHeader("Content-Type", "application/json");
          if (req.url === "/api/register" && req.method === "POST") {
            res.end(JSON.stringify({
              success: true,
              message: "Mock Verification code sent",
              debugCode: "123456"
              // For local dev
            }));
            return;
          }
          if (req.url === "/api/login" && req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", () => {
              const data = JSON.parse(body);
              if (data.totpCode === "123456") {
                res.end(JSON.stringify({
                  success: true,
                  token: "mock-session-token-" + Date.now(),
                  user: { email: data.email, plan: "free", device_fingerprint: "mock-fp" }
                }));
              } else {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Invalid Code (Use 123456)" }));
              }
            });
            return;
          }
          if (req.url === "/api/get-license" && req.method === "POST") {
            res.end(JSON.stringify({ success: true, license: { is_pro: false } }));
            return;
          }
          res.end(JSON.stringify({ success: false, error: "Mock API endpoint not implemented" }));
          return;
        }
        next();
      });
    }
  },
  build: {
    sourcemap: false,
    // 🔒 Security: Prevent leaking source code (.tsx) via source maps
    minify: "terser",
    // 🔒 Security: Use stronger minification
    terserOptions: {
      compress: {
        drop_console: true,
        // 🔒 Security: Remove console logs in production
        drop_debugger: true
      }
    },
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        zh: path.resolve(__dirname, "index_zh.html")
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxURVNUXFxcXGFwcFxcXFxhcHAxOFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcVEVTVFxcXFxhcHBcXFxcYXBwMThcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L1RFU1QvYXBwL2FwcDE4L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCB3YXNtIGZyb20gJ3ZpdGUtcGx1Z2luLXdhc20nXG5pbXBvcnQgdG9wTGV2ZWxBd2FpdCBmcm9tICd2aXRlLXBsdWdpbi10b3AtbGV2ZWwtYXdhaXQnXG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJ1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICd1cmwnXG5cbmNvbnN0IF9fZmlsZW5hbWUgPSBmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybClcbmNvbnN0IF9fZGlybmFtZSA9IHBhdGguZGlybmFtZShfX2ZpbGVuYW1lKVxuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcm9vdDogJy4nLFxuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSwgXG4gICAgd2FzbSgpLCBcbiAgICB0b3BMZXZlbEF3YWl0KCksXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgIGluY2x1ZGVBc3NldHM6IFsnZmF2aWNvbi5pY28nLCAnYXBwbGUtdG91Y2gtaWNvbi5wbmcnLCAnbWFzay1pY29uLnN2ZyddLFxuICAgICAgbWFuaWZlc3Q6IHtcbiAgICAgICAgbmFtZTogJ0NyeXB0b0tleSBJTScsXG4gICAgICAgIHNob3J0X25hbWU6ICdDcnlwdG9LZXknLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyZSwgb2ZmbGluZS1jYXBhYmxlIGVuY3J5cHRpb24gYW5kIGRlY3J5cHRpb24gdG9vbCcsXG4gICAgICAgIHRoZW1lX2NvbG9yOiAnI2ZmZmZmZicsXG4gICAgICAgIGljb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiAncHdhLTE5MngxOTIucG5nJyxcbiAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiAncHdhLTUxMng1MTIucG5nJyxcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJ1xuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfSxcbiAgICAgIHdvcmtib3g6IHtcbiAgICAgICAgZ2xvYlBhdHRlcm5zOiBbJyoqLyoue2pzLGNzcyxodG1sLGljbyxwbmcsc3ZnLHdhc20sanNvbn0nXSxcbiAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL2ZvbnRzXFwuZ29vZ2xlYXBpc1xcLmNvbVxcLy4qL2ksXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogJ0NhY2hlRmlyc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgIGNhY2hlTmFtZTogJ2dvb2dsZS1mb250cy1jYWNoZScsXG4gICAgICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDEwLFxuICAgICAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzNjUgLy8gPD09IDM2NSBkYXlzXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzZXM6IFswLCAyMDBdXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL2ZvbnRzXFwuZ3N0YXRpY1xcLmNvbVxcLy4qL2ksXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogJ0NhY2hlRmlyc3QnLFxuICAgICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgIGNhY2hlTmFtZTogJ2dzdGF0aWMtZm9udHMtY2FjaGUnLFxuICAgICAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAxMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzY1IC8vIDw9PSAzNjUgZGF5c1xuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgIGNhY2hlYWJsZVJlc3BvbnNlOiB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c2VzOiBbMCwgMjAwXVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH0pLFxuICAgIC8vIENTUCBJbmplY3Rpb24gUGx1Z2luXG4gICAge1xuICAgICAgbmFtZTogJ2luamVjdC1jc3AnLFxuICAgICAgdHJhbnNmb3JtSW5kZXhIdG1sKGh0bWwpIHtcbiAgICAgICAgY29uc3QgY3NwID0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdwcm9kdWN0aW9uJ1xuICAgICAgICAgICAgICA/IFwiZGVmYXVsdC1zcmMgJ3NlbGYnOyBzY3JpcHQtc3JjICdzZWxmJyAnd2FzbS11bnNhZmUtZXZhbCcgaHR0cHM6Ly9zdGF0aWMuY2xvdWRmbGFyZWluc2lnaHRzLmNvbTsgc3R5bGUtc3JjICdzZWxmJyAndW5zYWZlLWlubGluZSc7IGltZy1zcmMgJ3NlbGYnIGRhdGE6IGJsb2I6OyBtZWRpYS1zcmMgJ3NlbGYnIGRhdGE6OyBjb25uZWN0LXNyYyAnc2VsZicgaHR0cHM6Ly93d3cuZ3V0ZW5iZXJnLm9yZyBodHRwczovL2NyeXB0b2tleS1hdXRoLmMtMjA0OS53b3JrZXJzLmRldjsgd29ya2VyLXNyYyAnc2VsZicgYmxvYjo7XCJcbiAgICAgICAgICAgICAgOiBcImRlZmF1bHQtc3JjICdzZWxmJzsgc2NyaXB0LXNyYyAnc2VsZicgJ3Vuc2FmZS1ldmFsJyAndW5zYWZlLWlubGluZScgaHR0cDovL2xvY2FsaG9zdDo4MDk3IGh0dHBzOi8vc3RhdGljLmNsb3VkZmxhcmVpbnNpZ2h0cy5jb207IHN0eWxlLXNyYyAnc2VsZicgJ3Vuc2FmZS1pbmxpbmUnOyBpbWctc3JjICdzZWxmJyBkYXRhOiBibG9iOjsgbWVkaWEtc3JjICdzZWxmJyBkYXRhOjsgY29ubmVjdC1zcmMgJ3NlbGYnIGh0dHBzOi8vd3d3Lmd1dGVuYmVyZy5vcmcgaHR0cDovL2xvY2FsaG9zdDo4Nzg3IGh0dHA6Ly8xMjcuMC4wLjE6ODc4NyB3czovL2xvY2FsaG9zdDo4Nzg3IHdzOi8vMTI3LjAuMC4xOjg3ODcgaHR0cHM6Ly9jcnlwdG9rZXktYXV0aC5jLTIwNDkud29ya2Vycy5kZXY7IHdvcmtlci1zcmMgJ3NlbGYnIGJsb2I6O1wiO1xuXG4gICAgICAgIHJldHVybiBodG1sLnJlcGxhY2UoXG4gICAgICAgICAgLzxtZXRhIGh0dHAtZXF1aXY9XCJDb250ZW50LVNlY3VyaXR5LVBvbGljeVwiW14+XSo+LyxcbiAgICAgICAgICBgPG1ldGEgaHR0cC1lcXVpdj1cIkNvbnRlbnQtU2VjdXJpdHktUG9saWN5XCIgY29udGVudD1cIiR7Y3NwfVwiPmBcbiAgICAgICAgKTtcbiAgICAgIH0sXG4gICAgfVxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgICAncGF0aCc6ICdwYXRoLWJyb3dzZXJpZnknLFxuICAgICAgJ2x6bWEnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvdmVuZG9yL2x6bWEtd3JhcHBlci5qcycpLFxuICAgIH0sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDE2MTYsXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgICBpZiAocmVxLnVybCA9PT0gJy9pbmRleF96aC5odG1sJykge1xuICAgICAgICAgIC8vIFNlcnZlIGluZGV4X3poLmh0bWwgLSBoYW5kbGVkIGJ5IFZpdGUgZGVmYXVsdCB1c3VhbGx5LCBidXQgZ29vZCB0byBoYXZlIHBsYWNlaG9sZGVyXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChyZXEudXJsLnN0YXJ0c1dpdGgoJy9hcGkvJykpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgW01vY2sgQVBJXSAke3JlcS5tZXRob2R9ICR7cmVxLnVybH1gKTtcbiAgICAgICAgICBcbiAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmIChyZXEudXJsID09PSAnL2FwaS9yZWdpc3RlcicgJiYgcmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgICAgICAgICAgLy8gTW9jayBSZWdpc3RlclxuICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBcbiAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsIFxuICAgICAgICAgICAgICAgbWVzc2FnZTogJ01vY2sgVmVyaWZpY2F0aW9uIGNvZGUgc2VudCcsXG4gICAgICAgICAgICAgICBkZWJ1Z0NvZGU6ICcxMjM0NTYnIC8vIEZvciBsb2NhbCBkZXZcbiAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICBpZiAocmVxLnVybCA9PT0gJy9hcGkvbG9naW4nICYmIHJlcS5tZXRob2QgPT09ICdQT1NUJykge1xuICAgICAgICAgICAgIC8vIE1vY2sgTG9naW5cbiAgICAgICAgICAgICBsZXQgYm9keSA9ICcnO1xuICAgICAgICAgICAgIHJlcS5vbignZGF0YScsIGNodW5rID0+IGJvZHkgKz0gY2h1bmspO1xuICAgICAgICAgICAgIHJlcS5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShib2R5KTtcbiAgICAgICAgICAgICAgICAgaWYgKGRhdGEudG90cENvZGUgPT09ICcxMjM0NTYnKSB7XG4gICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB0b2tlbjogJ21vY2stc2Vzc2lvbi10b2tlbi0nICsgRGF0ZS5ub3coKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXI6IHsgZW1haWw6IGRhdGEuZW1haWwsIHBsYW46ICdmcmVlJywgZGV2aWNlX2ZpbmdlcnByaW50OiAnbW9jay1mcCcgfVxuICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDA7XG4gICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIENvZGUgKFVzZSAxMjM0NTYpJyB9KSk7XG4gICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIGlmIChyZXEudXJsID09PSAnL2FwaS9nZXQtbGljZW5zZScgJiYgcmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBsaWNlbnNlOiB7IGlzX3BybzogZmFsc2UgfSB9KSk7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBEZWZhdWx0IE1vY2sgUmVzcG9uc2UgZm9yIG90aGVyc1xuICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdNb2NrIEFQSSBlbmRwb2ludCBub3QgaW1wbGVtZW50ZWQnIH0pKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICBidWlsZDoge1xuICAgIHNvdXJjZW1hcDogZmFsc2UsIC8vIFx1RDgzRFx1REQxMiBTZWN1cml0eTogUHJldmVudCBsZWFraW5nIHNvdXJjZSBjb2RlICgudHN4KSB2aWEgc291cmNlIG1hcHNcbiAgICBtaW5pZnk6ICd0ZXJzZXInLCAvLyBcdUQ4M0RcdUREMTIgU2VjdXJpdHk6IFVzZSBzdHJvbmdlciBtaW5pZmljYXRpb25cbiAgICB0ZXJzZXJPcHRpb25zOiB7XG4gICAgICBjb21wcmVzczoge1xuICAgICAgICBkcm9wX2NvbnNvbGU6IHRydWUsIC8vIFx1RDgzRFx1REQxMiBTZWN1cml0eTogUmVtb3ZlIGNvbnNvbGUgbG9ncyBpbiBwcm9kdWN0aW9uXG4gICAgICAgIGRyb3BfZGVidWdnZXI6IHRydWUsXG4gICAgICB9LFxuICAgIH0sXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgaW5wdXQ6IHtcbiAgICAgICAgbWFpbjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2luZGV4Lmh0bWwnKSxcbiAgICAgICAgemg6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdpbmRleF96aC5odG1sJyksXG4gICAgICB9LFxuICAgIH0sXG4gIH1cbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTZPLFNBQVMsb0JBQW9CO0FBQzFRLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsT0FBTyxtQkFBbUI7QUFDMUIsU0FBUyxlQUFlO0FBQ3hCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHFCQUFxQjtBQU5tSCxJQUFNLDJDQUEyQztBQVFsTSxJQUFNLGFBQWEsY0FBYyx3Q0FBZTtBQUNoRCxJQUFNLFlBQVksS0FBSyxRQUFRLFVBQVU7QUFHekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsTUFBTTtBQUFBLEVBQ04sU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sS0FBSztBQUFBLElBQ0wsY0FBYztBQUFBLElBQ2QsUUFBUTtBQUFBLE1BQ04sY0FBYztBQUFBLE1BQ2QsZUFBZSxDQUFDLGVBQWUsd0JBQXdCLGVBQWU7QUFBQSxNQUN0RSxVQUFVO0FBQUEsUUFDUixNQUFNO0FBQUEsUUFDTixZQUFZO0FBQUEsUUFDWixhQUFhO0FBQUEsUUFDYixhQUFhO0FBQUEsUUFDYixPQUFPO0FBQUEsVUFDTDtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFVBQ1I7QUFBQSxVQUNBO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsVUFDUjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsTUFD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
