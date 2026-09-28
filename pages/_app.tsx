import "../styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { darkTheme, lightTheme } from "../styles/theme";
import { ThemeProvider as AppThemeProvider } from "../helpers/context/theme-context";
import { useTheme } from "../helpers/context/theme-context";
import Layout from "../components/layout/Layout";

function ThemedApp({ Component, pageProps }: AppProps) {
  const { mode } = useTheme();
  const theme = mode === "dark" ? darkTheme : lightTheme;

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
