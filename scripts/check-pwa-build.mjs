import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const indexPath = path.join(distDir, 'index.html');
const swPath = path.join(distDir, 'sw.js');

function fail(message) {
  console.error(`[PWA] rescue build check failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(distDir)) {
  fail('dist/ directory is missing. Run vite build first.');
}

if (!fs.existsSync(indexPath)) {
  fail('dist/index.html is missing.');
}

if (!fs.existsSync(swPath)) {
  fail('dist/sw.js is missing.');
}

const swSource = fs.readFileSync(swPath, 'utf8');
const distFiles = fs.readdirSync(distDir);

if (distFiles.some((file) => /^workbox-.*\.js$/i.test(file))) {
  fail('dist/ contains a generated Workbox worker. Disable vite-plugin-pwa for this release.');
}

if (!swSource.includes('CACHE_MATCH')) {
  fail('dist/sw.js is not the rescue cleanup worker.');
}

if (swSource.includes('precacheAndRoute') || swSource.includes('workbox-')) {
  fail('dist/sw.js still contains Workbox precache logic.');
}

if (!swSource.includes('self.registration.unregister()')) {
  fail('dist/sw.js must unregister itself after cleanup.');
}

console.log('[PWA] rescue build check OK: dist/sw.js is the cleanup worker and no Workbox bundle was generated.');
