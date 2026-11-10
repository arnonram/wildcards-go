// @ts-check
import { serwist } from '@serwist/next/config';

export default serwist({
  swSrc: 'sw/sw.ts',
  swDest: 'public/sw.js',
  precachePrerendered: true,
  // Only link previews fetch it; installed clients don't need it offline.
  globIgnores: ['public/images/og-cover.jpg'],
});
