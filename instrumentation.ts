/** Throws when the server's configuration cannot work in this environment. */
export async function checkServerConfig() {
  const { createEmailSender } = await import('./server/email');
  createEmailSender(process.env);
}

/**
 * Runs once when the server starts (not during `next build`). A misconfigured
 * production server exits here instead of failing on someone's first sign-in;
 * Next only logs errors thrown from this hook, so exit explicitly.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    await checkServerConfig();
  } catch (error) {
    console.error(`Refusing to start: ${(error as Error).message}`);
    process.exit(1);
  }
}
