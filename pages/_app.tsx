import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { ThemeProvider } from '../helpers/context/theme-context';
import { startSync } from '../helpers/offline/sync';

export default function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    startSync();
    const enableWorker =
      process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_SW === '1';
    if (enableWorker && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }
  }, []);

  return (
    <ThemeProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ThemeProvider>
  );
}
