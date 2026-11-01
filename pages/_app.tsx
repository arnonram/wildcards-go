import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { LocaleProvider } from '../helpers/context/locale-context';
import { ThemeProvider } from '../helpers/context/theme-context';
import { startAccounts } from '../helpers/offline/account';

export default function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const stopAccounts = startAccounts();
    const enableWorker =
      process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_SW === '1';
    if (enableWorker && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    } else if ('serviceWorker' in navigator) {
      // A worker left by an earlier production run would serve stale pages and
      // fail to precache build files `next dev` doesn't have. Remove it.
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((r) => r.unregister())));
    }
    return () => {
      void stopAccounts.then((stop) => stop());
    };
  }, []);

  return (
    <ThemeProvider>
      <LocaleProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </LocaleProvider>
    </ThemeProvider>
  );
}
