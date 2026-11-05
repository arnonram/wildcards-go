import { afterEach, expect, test } from 'bun:test';
import { clearInviteCookie, setInviteCookie } from './invite-cookie';

const g = globalThis as unknown as { document?: unknown; location?: unknown };
const saved = { document: g.document, location: g.location };
let written: string[] = [];

function fakeBrowser(protocol: string) {
  written = [];
  g.location = { protocol };
  g.document = {
    set cookie(value: string) {
      written.push(value);
    },
  };
}

afterEach(() => {
  g.document = saved.document;
  g.location = saved.location;
});

test('the invite cookie is short-lived, site-wide and encoded', () => {
  fakeBrowser('http:');
  setInviteCookie('our table');
  expect(written).toEqual(['wcg-invite=our%20table; Path=/; Max-Age=600; SameSite=Lax']);
});

test('the invite cookie is Secure on https', () => {
  fakeBrowser('https:');
  setInviteCookie('t');
  expect(written[0]).toEndWith('; Secure');
});

test('clearing expires the invite cookie', () => {
  fakeBrowser('http:');
  clearInviteCookie();
  expect(written).toEqual(['wcg-invite=; Path=/; Max-Age=0; SameSite=Lax']);
});
