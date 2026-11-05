import { storageFromEnv } from './backend';
import { createEmailSender } from './email';
import { anySignInMethod, signInOptions } from './sign-in-options';

/** Throws when the server's configuration cannot work in this environment. */
export function checkServerConfig() {
  // Links in emails and OAuth redirects are built from it; behind a proxy the
  // request's own host may not be the address players use.
  if (process.env.NODE_ENV === 'production' && !process.env.BETTER_AUTH_URL) {
    throw new Error(
      'BETTER_AUTH_URL is required: the address players use, e.g. https://wcg.example.com',
    );
  }
  // Validates SMTP_URL and EMAIL_FROM whenever SMTP_URL is set.
  createEmailSender(process.env);
  if (!anySignInMethod(signInOptions(process.env))) {
    throw new Error(
      'No sign-in method is enabled: set SMTP_URL and EMAIL_FROM, AUTH_PASSWORD=1, ' +
        'or a Google or Discord client id and secret',
    );
  }
}

/**
 * Self-hosted SQLite is opened and migrated at start, so a bad path or a
 * read-only volume stops the server with the path in the message. Hosted
 * MongoDB keeps connecting on first use: an Atlas blip must not kill a cold
 * start that could serve the next request fine.
 */
export async function prepareStorage(): Promise<void> {
  if (storageFromEnv(process.env).kind !== 'sqlite') return;
  const { getAuth } = await import('./auth');
  await getAuth();
}

/**
 * A misconfigured production server exits instead of failing on someone's
 * first sign-in; Next only logs errors thrown from instrumentation.
 */
export async function refuseToStartIfMisconfigured() {
  try {
    checkServerConfig();
    await prepareStorage();
  } catch (error) {
    console.error(`Refusing to start: ${(error as Error).message}`);
    process.exit(1);
  }
}
