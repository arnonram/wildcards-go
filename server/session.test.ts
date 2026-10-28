import { expect, test } from 'bun:test';
import type { NextApiRequest, NextApiResponse } from 'next';
import { authorize } from './session';

function req(headers: Record<string, string>) {
  return { headers } as unknown as NextApiRequest;
}

function fakeRes() {
  const res = {
    statusCode: undefined as number | undefined,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
  };
  return res;
}

function call(headers: Record<string, string>, user: string | null, deleted: string[] = []) {
  const res = fakeRes();
  const result = authorize(
    req(headers),
    res as unknown as NextApiResponse,
    async () => user,
    async (id) => deleted.includes(id),
  );
  return { res, result };
}

test('no session is 401', async () => {
  const { res, result } = call({ 'x-wcg-store-owner': 'u1' }, null);
  expect(await result).toBeNull();
  expect(res.statusCode).toBe(401);
});

test('missing store owner header is 401', async () => {
  const { res, result } = call({}, 'u1');
  expect(await result).toBeNull();
  expect(res.statusCode).toBe(401);
});

test('store owner different from session user is 401', async () => {
  const { res, result } = call({ 'x-wcg-store-owner': 'u2' }, 'u1');
  expect(await result).toBeNull();
  expect(res.statusCode).toBe(401);
});

test('matching store owner returns the user id', async () => {
  const { res, result } = call({ 'x-wcg-store-owner': 'u1' }, 'u1');
  expect(await result).toBe('u1');
  expect(res.statusCode).toBeUndefined();
});

test('a store whose account was deleted gets 410', async () => {
  const { res, result } = call({ 'x-wcg-store-owner': 'gone' }, null, ['gone']);
  expect(await result).toBeNull();
  expect(res.statusCode).toBe(410);
});

test('a deleted store owner gets 410 even when another user is signed in', async () => {
  const { res, result } = call({ 'x-wcg-store-owner': 'gone' }, 'u1', ['gone']);
  expect(await result).toBeNull();
  expect(res.statusCode).toBe(410);
});
