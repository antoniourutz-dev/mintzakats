import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig, loadEnv } from 'vite';

function resolveBuildVersion(): string {
  const fromCi =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.GITHUB_SHA?.slice(0, 7);
  if (fromCi) {
    return fromCi;
  }
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const buildVersion = resolveBuildVersion();

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        filename: 'sw.js',
        manifestFilename: 'manifest.webmanifest',
        includeAssets: ['favicon.svg', 'icon-512.png'],
        manifest: {
          name: 'Mintzakats',
          short_name: 'Mintzakats',
          description: 'Eguneko 20 galdera euskara praktikatzeko. 7 eguneko zikloa.',
          theme_color: '#4f46e5',
          background_color: '#4f46e5',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/favicon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          skipWaiting: false,
          clientsClaim: false,
          // index.html MUST be precached when navigateFallback is set (Workbox NavigationRoute).
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.method !== 'GET',
              handler: 'NetworkOnly',
              method: 'POST',
            },
            {
              urlPattern: ({ request }) => request.method !== 'GET',
              handler: 'NetworkOnly',
              method: 'PUT',
            },
            {
              urlPattern: ({ request }) => request.method !== 'GET',
              handler: 'NetworkOnly',
              method: 'PATCH',
            },
            {
              urlPattern: ({ request }) => request.method !== 'GET',
              handler: 'NetworkOnly',
              method: 'DELETE',
            },
            {
              urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co'),
              handler: 'NetworkOnly',
            },
            {
              urlPattern: ({ url }) =>
                url.pathname.includes('/rest/v1/') ||
                url.pathname.includes('/auth/v1/') ||
                url.pathname.includes('/functions/v1/') ||
                url.pathname.includes('/realtime/v1/'),
              handler: 'NetworkOnly',
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(buildVersion),
      'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(buildVersion),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
