import '../styles/globals.css';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import type { AppProps } from 'next/app';
import Layout from '../components/layout/Layout';
import { ThemeProvider as AppThemeProvider, useTheme } from '../helpers/context/theme-context';
import { darkTheme, lightTheme } from '../styles/theme';

function ThemedApp({ Component, pageProps }: AppProps) {
  const { mode } = useTheme();
  const theme = mode === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ThemeProvider>
  );
}

function MyApp(props: AppProps) {
  return (
    <AppThemeProvider>
      <ThemedApp {...props} />
    </AppThemeProvider>
  );
}

export default MyApp;
