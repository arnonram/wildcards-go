import Head from 'next/head';
import type { ReactNode } from 'react';

const CONTACT = 'privacy@orderofthenuts.club';
const UPDATED = '3 November 2026';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-base font-semibold uppercase tracking-[0.08em] text-heading">
        {title}
      </h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}

const listClass = 'list-disc space-y-1.5 pl-5';

const linkClass = 'font-medium text-accent underline-offset-2 hover:underline';

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Privacy — Wild Cards Go</title>
      </Head>

      <article className="mx-auto max-w-2xl">
        <h1 className="font-display text-xl font-semibold uppercase tracking-[0.08em] text-heading">
          Privacy
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Wild Cards Go is a free, non-commercial fan project run by Arnon Ram. It keeps only what
          it needs to sign you in and sync your characters. There are no ads, no analytics and no
          tracking. Last updated {UPDATED}.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This policy covers the official site, wildcards.orderofthenuts.club. Anyone can run their
          own copy of the app; a copy on any other address is run by whoever hosts it, and they
          decide how its data is handled.
        </p>

        <Section title="Without an account">
          <p>
            You can use the app without signing in. Your characters then stay in this browser only
            and nothing about you is sent to us, apart from the ordinary requests that load the app.
          </p>
        </Section>

        <Section title="What we store when you sign in">
          <ul className={listClass}>
            <li>
              <strong className="text-ink">Your account:</strong> email address, name, and the
              profile picture link Google or Discord provides, if you sign in with them.
            </li>
            <li>
              <strong className="text-ink">Linked sign-ins:</strong> for Google or Discord, your id
              there and the tokens they issue when you sign in.
            </li>
            <li>
              <strong className="text-ink">Sessions:</strong> a random token per signed-in device,
              kept for 30 days and renewed while you use the app. We don&apos;t record your IP
              address or browser with it.
            </li>
            <li>
              <strong className="text-ink">Email sign-in links:</strong> only a scrambled (hashed)
              copy of the link, which expires after 5 minutes.
            </li>
            <li>
              <strong className="text-ink">Your characters and portraits</strong>, so they sync
              between your devices.
            </li>
            <li>
              <strong className="text-ink">Abuse protection:</strong> to limit repeated sign-in
              attempts, a counter keyed by IP address is kept for a few minutes and then deleted.
            </li>
          </ul>
        </Section>

        <Section title="In your browser">
          <ul className={listClass}>
            <li>One sign-in cookie, needed to keep you signed in. No other cookies.</li>
            <li>Your characters and portraits, so the app works offline, and your theme choice.</li>
            <li>The app&apos;s own files, cached so it opens without a connection.</li>
          </ul>
        </Section>

        <Section title="Who else handles it">
          <ul className={listClass}>
            <li>
              <strong className="text-ink">Vercel</strong> hosts the app and handles every request,
              including your IP address, as any web host does.
            </li>
            <li>
              <strong className="text-ink">MongoDB Atlas</strong> stores the data above, in an EU
              region.
            </li>
            <li>
              <strong className="text-ink">Brevo</strong> sends the sign-in and account emails, so
              it sees your email address and the link.
            </li>
            <li>
              <strong className="text-ink">Google or Discord</strong>, only if you choose to sign in
              with them.
            </li>
          </ul>
          <p>
            Some of these companies are based in the US. Your data isn&apos;t sold or shared with
            anyone else.
          </p>
        </Section>

        <Section title="Why">
          <p>
            Storing your account and characters is how the service you sign up for works. The
            short-lived sign-in counters protect the service and its users from abuse.
          </p>
        </Section>

        <Section title="Deleting your account">
          <p>
            Choose <strong className="text-ink">Delete account</strong> in the account menu. After
            you confirm through the emailed link, your account, sign-ins, sessions, characters and
            portraits are deleted. We keep only the account&apos;s random id, with no email or name,
            so your other devices know to clear their copy.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            You can ask for a copy of your data, have it corrected or deleted, or object to how
            it&apos;s used. Write to{' '}
            <a href={`mailto:${CONTACT}`} className={linkClass}>
              {CONTACT}
            </a>
            . You can also complain to your local data protection authority.
          </p>
        </Section>
      </article>
    </>
  );
}
