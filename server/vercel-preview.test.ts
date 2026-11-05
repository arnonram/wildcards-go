import { expect, test } from 'bun:test';
import { vercelPreviewBaseURL } from './vercel-preview';

const PREVIEW = {
  BETTER_AUTH_URL: 'https://wcg.example',
  VERCEL_ENV: 'preview',
  VERCEL_URL: 'wcg-abc123-team.vercel.app',
  VERCEL_BRANCH_URL: 'wcg-git-feature-team.vercel.app',
};

test('a Vercel preview accepts its own generated addresses, and only those', () => {
  expect(vercelPreviewBaseURL(PREVIEW)).toEqual({
    allowedHosts: ['wcg-abc123-team.vercel.app', 'wcg-git-feature-team.vercel.app'],
    protocol: 'https',
    fallback: 'https://wcg.example',
  });
});

test('production on Vercel, and anywhere else, gets nothing', () => {
  expect(vercelPreviewBaseURL({ ...PREVIEW, VERCEL_ENV: 'production' })).toBeUndefined();
  expect(vercelPreviewBaseURL({ BETTER_AUTH_URL: 'https://wcg.example' })).toBeUndefined();
});

test('a preview without its system variables gets nothing', () => {
  expect(vercelPreviewBaseURL({ VERCEL_ENV: 'preview' })).toBeUndefined();
});
