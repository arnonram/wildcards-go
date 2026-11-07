import { getIPFromHeader, isValidIP } from '@better-auth/core/utils/ip';

/**
 * Addresses only a proxy on the same host or network, or a player on the
 * same LAN, can connect from. Tailscale's 100.64.0.0/10 is left out: those
 * are players connecting from anywhere.
 */
const PRIVATE_NETWORKS = [
  '127.0.0.0/8',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '::1/128',
  'fc00::/7',
  'fe80::/10',
];

/** `::ffff:10.0.0.2`, as Node reports IPv4 peers on dual-stack sockets, is 10.0.0.2. */
function unwrapMapped(ip: string): string {
  return ip.toLowerCase().startsWith('::ffff:') && ip.includes('.') ? ip.slice(7) : ip;
}

/**
 * The client a self-hosted server should rate-limit, from the forwarded
 * chain plus the address that actually connected. Walking from the right,
 * private-network hops are proxies and are skipped: exposed to the internet,
 * the public peer itself is the client and a forged header changes nothing;
 * behind Caddy, cloudflared or Tailscale serve, the client they forward is
 * used. When every hop is private (players on the LAN), the farthest one is
 * the player. Better Auth trusts a single-address header, so the result is
 * handed to it that way.
 */
export function clientIp(
  forwardedFor: string | string[] | undefined,
  peer: string | undefined,
): string | undefined {
  const hops = [forwardedFor ?? [], peer ?? []]
    .flat()
    .flatMap((value) => value.split(','))
    .map((hop) => unwrapMapped(hop.trim()))
    .filter(Boolean);
  if (hops.length === 0) return undefined;
  const walked = getIPFromHeader(hops.join(','), { trustedProxies: PRIVATE_NETWORKS });
  if (walked) return walked;
  // Every hop private: the farthest. A garbled header: only the peer is sure.
  if (hops.every(isValidIP)) return hops[0];
  return peer ? unwrapMapped(peer) : undefined;
}
