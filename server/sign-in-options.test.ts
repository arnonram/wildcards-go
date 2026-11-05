import { expect, test } from 'bun:test';
import { signInOptions } from './sign-in-options';

const SMTP = { SMTP_URL: 'smtp://u:k@smtp.example.com:587', EMAIL_FROM: 'a@example.com' };

test('the hosted configuration keeps today’s options', () => {
  expect(
    signInOptions({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://x',
      ...SMTP,
      GOOGLE_CLIENT_ID: 'id',
      GOOGLE_CLIENT_SECRET: 'secret',
    }),
  ).toEqual({
    google: true,
    discord: false,
    email: true,
    password: false,
    passwordMinLength: 8,
    signUp: 'open',
  });
});

test('a provider needs both its id and secret', () => {
  expect(signInOptions({ DISCORD_CLIENT_ID: 'id' }).discord).toBe(false);
  expect(signInOptions({ DISCORD_CLIENT_ID: 'id', DISCORD_CLIENT_SECRET: 's' }).discord).toBe(true);
});

test('self-hosted without an invite code is closed to new accounts', () => {
  expect(signInOptions({ NODE_ENV: 'production', AUTH_PASSWORD: '1' }).signUp).toBe('closed');
});

test('an invite code makes sign-up need it', () => {
  expect(signInOptions({ SIGNUP_INVITE_CODE: 'table' }).signUp).toBe('invite');
  expect(signInOptions({ MONGODB_URI: 'mongodb://x', SIGNUP_INVITE_CODE: 'table' }).signUp).toBe(
    'invite',
  );
});

test('SIGNUP_OPEN opens self-hosted sign-up', () => {
  expect(signInOptions({ SIGNUP_OPEN: '1' }).signUp).toBe('open');
});

test('password sign-in is on only with AUTH_PASSWORD=1', () => {
  expect(signInOptions({ AUTH_PASSWORD: '1' }).password).toBe(true);
  expect(signInOptions({ AUTH_PASSWORD: 'true' }).password).toBe(false);
  expect(signInOptions({}).password).toBe(false);
});

test('email links need SMTP in production', () => {
  expect(signInOptions({ NODE_ENV: 'production' }).email).toBe(false);
  expect(signInOptions({ NODE_ENV: 'production', ...SMTP }).email).toBe(true);
});

test('email links print to the console in development', () => {
  expect(signInOptions({ NODE_ENV: 'development' }).email).toBe(true);
});

test('the minimum password length defaults to 8 and can be lowered', () => {
  expect(signInOptions({}).passwordMinLength).toBe(8);
  expect(signInOptions({ AUTH_PASSWORD_MIN_LENGTH: '4' }).passwordMinLength).toBe(4);
});

test('a nonsense minimum password length falls back to 8', () => {
  expect(signInOptions({ AUTH_PASSWORD_MIN_LENGTH: 'abc' }).passwordMinLength).toBe(8);
  expect(signInOptions({ AUTH_PASSWORD_MIN_LENGTH: '0' }).passwordMinLength).toBe(8);
});
