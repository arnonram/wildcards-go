import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { ThemeProvider } from '../helpers/context/theme-context';
import { startSync } from '../helpers/offline/sync';

export default function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    startSync();
  }, []);

  return (
    <ThemeProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ThemeProvider>
  );
}
