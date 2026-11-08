/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import { NetworkOnly, type PrecacheEntry, Serwist, type SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** The prerendered sheet page; it reads the id from the URL, so it serves every character. */
const CHARACTER_SHELL = '/character/[characterId]';

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    // The sync engine owns API data; a cached response would be stale.
    {
      matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/api/'),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: '/offline', matcher: ({ request }) => request.destination === 'document' }],
  },
});

async function loadPage(request: Request): Promise<Response> {
  try {
    return await fetch(request);
  } catch {
    const { pathname } = new URL(request.url);
    const shell = pathname.startsWith('/character/') ? CHARACTER_SHELL : pathname;
    return (
      (await serwist.matchPrecache(shell)) ??
      (await serwist.matchPrecache('/offline')) ??
      Response.error()
    );
  }
}

// Registered before Serwist's listener so page loads skip its cache-first precache
// route: online, every load gets the latest deploy; the precache is the offline copy.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode !== 'navigate' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(loadPage(request));
});

serwist.addEventListeners();
