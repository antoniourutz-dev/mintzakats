import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const indexPath = path.join(distDir, 'index.html');
const swPath = path.join(distDir, 'sw.js');

function fail(message) {
  console.error(`[PWA] build check failed: ${message}`);
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

if (!swSource.includes('index.html')) {
  fail('dist/sw.js precache manifest does not reference index.html.');
}

if (!swSource.includes('precacheAndRoute')) {
  fail('dist/sw.js does not use Workbox precacheAndRoute.');
}

if (swSource.includes('non-precached-url')) {
  fail('dist/sw.js contains non-precached-url placeholder.');
}

console.log('[PWA] build check OK: dist/index.html exists and is listed in precache manifest.');
