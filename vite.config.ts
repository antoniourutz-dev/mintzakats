import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
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
    plugins: [react(), tailwindcss()],
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
