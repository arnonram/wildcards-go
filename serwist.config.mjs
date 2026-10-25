// @ts-check
import { serwist } from '@serwist/next/config';

export default serwist({
  swSrc: 'sw/sw.ts',
  swDest: 'public/sw.js',
  precachePrerendered: true,
});
