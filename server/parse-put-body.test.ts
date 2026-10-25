import { expect, test } from 'bun:test';
import { WildCardCharacter } from '../dtos/WildCardCharacter.dto';
import { parsePutBody } from './parse-put-body';

function body(data: unknown, extra: Record<string, unknown> = {}) {
  return { baseVersion: 1, deleted: false, data, ...extra };
}

const valid = JSON.parse(JSON.stringify(new WildCardCharacter('Ana')));

test('accepts a well-formed character', () => {
  expect(parsePutBody(body(valid))).toEqual({ baseVersion: 1, deleted: false, data: valid });
});

test('rejects bad envelope fields', () => {
  expect(parsePutBody(null)).toBeNull();
  expect(parsePutBody(body(valid, { baseVersion: -1 }))).toBeNull();
  expect(parsePutBody(body(valid, { deleted: 'no' }))).toBeNull();
  expect(parsePutBody(body([]))).toBeNull();
});

test('rejects characters whose core fields have the wrong type', () => {
  expect(parsePutBody(body({ ...valid, name: 42 }))).toBeNull();
  expect(parsePutBody(body({ ...valid, wounds: '3' }))).toBeNull();
  expect(parsePutBody(body({ ...valid, fatigue: null }))).toBeNull();
  expect(parsePutBody(body({ ...valid, attributes: {} }))).toBeNull();
  expect(parsePutBody(body({ ...valid, skills: 'none' }))).toBeNull();
});

test('a tombstone needs no character fields', () => {
  expect(parsePutBody(body({}, { deleted: true }))).not.toBeNull();
});
