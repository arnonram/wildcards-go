import { createEmailSender } from './email';

/** Throws when the server's configuration cannot work in this environment. */
export function checkServerConfig() {
  createEmailSender(process.env);
}

/**
 * A misconfigured production server exits instead of failing on someone's
 * first sign-in; Next only logs errors thrown from instrumentation.
 */
export function refuseToStartIfMisconfigured() {
  try {
    checkServerConfig();
  } catch (error) {
    console.error(`Refusing to start: ${(error as Error).message}`);
    process.exit(1);
  }
}
