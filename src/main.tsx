import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {registerServiceWorker} from './pwa/registerServiceWorker';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void registerServiceWorker();
  });
}

window.addEventListener('error', (event: ErrorEvent | Event) => {
  const errorEvent = event as ErrorEvent;
  const errorMsg = errorEvent.message || '';
  const isChunkError =
    errorMsg.includes('Loading chunk') ||
    errorMsg.includes('Loading failed') ||
    errorMsg.includes('Kargatzeak huts egin du');

  const target = event.target;
  const isResourceError =
    target instanceof HTMLScriptElement || target instanceof HTMLLinkElement;

  if (!isChunkError && !isResourceError) {
    return;
  }

  console.warn('[PWA] Critical resource load error detected', event);

  const lastReload = sessionStorage.getItem('pwa_chunk_reload');
  const now = Date.now();
  if (!lastReload || now - Number.parseInt(lastReload, 10) > 10_000) {
    sessionStorage.setItem('pwa_chunk_reload', now.toString());
    window.location.reload();
  }
}, true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
