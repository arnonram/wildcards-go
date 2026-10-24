import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Layout from '../components/layout/Layout';
import { ThemeProvider } from '../helpers/context/theme-context';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ThemeProvider>
  );
}
