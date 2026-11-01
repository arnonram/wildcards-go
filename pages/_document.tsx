import { Head, Html, Main, NextScript } from 'next/document';
import { LOCALE_STORAGE_KEY, LOCALES, resolveLocale } from '../helpers/i18n';

const themeScript = `
(function () {
  try {
    var skin = localStorage.getItem('wc-skin');
    var mode = localStorage.getItem('wc-mode');
    var root = document.documentElement;
    if (skin === 'parchment' || skin === 'classic') root.dataset.skin = 'classic';
    if (skin === 'vtt' || skin === 'modern') root.dataset.skin = 'modern';
    if (mode === 'light' || mode === 'dark') root.dataset.mode = mode;
    root.style.colorScheme = root.dataset.mode || 'light';
  } catch (error) {}
  try {
    document.documentElement.lang = (${resolveLocale.toString()})(
      localStorage.getItem(${JSON.stringify(LOCALE_STORAGE_KEY)}),
      navigator.languages || [],
      ${JSON.stringify(LOCALES)}
    );
  } catch (error) {}
})();
`;

export default function Document() {
  return (
    <Html
      lang="en"
      data-skin="classic"
      data-mode="light"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <Head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: blocking script must run before first paint to avoid a theme flash */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#f3ead6" />
        <meta name="application-name" content="Wild Cards Go" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Wild Cards Go" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
