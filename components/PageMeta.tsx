import Head from 'next/head';

type PageMetaProps = {
  title: string;
  description: string;
  path: string;
};

export function PageMeta({ title, description, path }: PageMetaProps) {
  const siteUrl = process.env.SITE_URL;
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Wild Cards Go" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta name="twitter:card" content="summary_large_image" />
      {siteUrl && (
        <>
          <link rel="canonical" href={`${siteUrl}${path}`} />
          <meta property="og:url" content={`${siteUrl}${path}`} />
          <meta property="og:image" content={`${siteUrl}/images/og-cover.jpg`} />
        </>
      )}
    </Head>
  );
}
