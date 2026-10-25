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
  runtimeCaching: [
    // The sync engine owns API data; a cached response would be stale.
    {
      matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/api/'),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ request, sameOrigin, url }) =>
        sameOrigin && request.mode === 'navigate' && url.pathname.startsWith('/character/'),
      handler: async ({ request }) => {
        try {
          return await fetch(request);
        } catch {
          return (await serwist.matchPrecache(CHARACTER_SHELL)) ?? Response.error();
        }
      },
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: '/offline', matcher: ({ request }) => request.destination === 'document' }],
  },
});

serwist.addEventListeners();
