import { expect, test } from 'bun:test';
import { getIP } from '@better-auth/core/utils/ip';
import { clientIp } from './client-ip';

/** The IP Better Auth rate-limits on, given the header the handler sets. */
function limitedIp(peer: string, forwardedFor?: string) {
  const ip = clientIp(forwardedFor, peer);
  const headers = new Headers(ip ? { 'x-forwarded-for': ip } : {});
  return getIP(headers, {} as never);
}

test('exposed directly, the connecting address wins over a forged header', () => {
  expect(limitedIp('198.51.100.7')).toBe('198.51.100.7');
  expect(limitedIp('198.51.100.7', '203.0.113.1')).toBe('198.51.100.7');
});

test('players on the LAN, with no proxy, each get their own address', () => {
  expect(limitedIp('192.168.1.20')).toBe('192.168.1.20');
  expect(limitedIp('192.168.1.21')).toBe('192.168.1.21');
});

test('behind a proxy on a private network, the client it forwards is used', () => {
  // Caddy in Docker sets the header to the client it saw.
  expect(limitedIp('172.18.0.3', '198.51.100.7')).toBe('198.51.100.7');
  // ...including a player on the LAN.
  expect(limitedIp('172.18.0.3', '192.168.1.20')).toBe('192.168.1.20');
  // Tailscale serve forwards from localhost; IPv4-mapped peers are unwrapped.
  expect(limitedIp('::ffff:127.0.0.1', '100.101.102.103')).toBe('100.101.102.103');
  // Cloudflare appends the real client after anything the client sent.
  expect(limitedIp('172.18.0.4', '203.0.113.1, 198.51.100.7')).toBe('198.51.100.7');
});

test('a garbled header falls back to the peer', () => {
  expect(limitedIp('192.168.1.20', '203.0.113.1, nonsense')).toBe('192.168.1.20');
});

test('no peer and no header gives nothing', () => {
  expect(clientIp(undefined, undefined)).toBeUndefined();
});
