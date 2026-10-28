/**
 * Runs once when the server starts (not during `next build`). The Node-only
 * check lives in its own module, imported only on the Node runtime, so the
 * Edge build never sees `process.exit`.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { refuseToStartIfMisconfigured } = await import('./server/startup-check');
    refuseToStartIfMisconfigured();
  }
}
