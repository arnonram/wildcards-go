import { expect, test } from 'bun:test';
import { inviteFromCookies, inviteMatches, placeholderEmail } from './invite';

test('the right invite code matches', () => {
  expect(inviteMatches('table', 'table')).toBe(true);
});

test('a wrong, missing or differently sized code does not match', () => {
  expect(inviteMatches('tablf', 'table')).toBe(false);
  expect(inviteMatches(undefined, 'table')).toBe(false);
  expect(inviteMatches('', 'table')).toBe(false);
  expect(inviteMatches('table-and-more', 'table')).toBe(false);
});

test('password accounts get a lowercased placeholder address', () => {
  expect(placeholderEmail('Bob')).toBe('bob@users.invalid');
});

test('the invite is read from the cookie header, decoded', () => {
  expect(inviteFromCookies('a=1; wcg-invite=our%20table; b=2')).toBe('our table');
  expect(inviteFromCookies('a=1')).toBeUndefined();
  expect(inviteFromCookies(null)).toBeUndefined();
});
