import { expect, test } from 'bun:test';
import { deleteAccountPageUrl } from './auth';

test('the delete-account email links to the app page on the same origin', () => {
  const callback =
    'https://wildcards.example/api/auth/delete-user/callback?token=abc&callbackURL=%2F';
  expect(deleteAccountPageUrl(callback, 'abc')).toBe(
    'https://wildcards.example/delete-account?token=abc',
  );
});
