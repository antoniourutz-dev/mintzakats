import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

function resolveBuildVersion(): string {
  const fromCi =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.GITHUB_SHA?.slice(0, 7);
  if (fromCi) {
    return fromCi;
  }
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function mintzakatsPwaPlugin(buildVersion: string): Plugin {
  const swSource = path.resolve(__dirname, 'public/sw.js');

  const injectVersion = (content: string) =>
    content.replaceAll('__SW_CACHE_VERSION__', buildVersion);

  return {
    name: 'mintzakats-pwa',
    enforce: 'post',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url === '/sw.js') {
          const content = injectVersion(fs.readFileSync(swSource, 'utf8'));
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(content);
          return;
        }
        next();
      });
    },
    writeBundle() {
      const distSw = path.resolve(__dirname, 'dist/sw.js');
      const content = injectVersion(fs.readFileSync(swSource, 'utf8'));
      fs.writeFileSync(distSw, content);
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const buildVersion = resolveBuildVersion();

  return {
    plugins: [react(), tailwindcss(), mintzakatsPwaPlugin(buildVersion)],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(buildVersion),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
