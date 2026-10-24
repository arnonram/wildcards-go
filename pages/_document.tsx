import { Head, Html, Main, NextScript } from 'next/document';

const themeScript = `
(function () {
  try {
    var skin = localStorage.getItem('wc-skin');
    var mode = localStorage.getItem('wc-mode');
    var root = document.documentElement;
    if (skin === 'parchment' || skin === 'vtt') root.dataset.skin = skin;
    if (mode === 'light' || mode === 'dark') root.dataset.mode = mode;
    root.style.colorScheme = root.dataset.mode || 'light';
  } catch (error) {}
})();
`;

export default function Document() {
  return (
    <Html lang="en" data-skin="parchment" data-mode="light" suppressHydrationWarning>
      <Head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: blocking script must run before first paint to avoid a theme flash */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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
