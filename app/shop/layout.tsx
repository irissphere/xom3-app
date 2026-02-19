import { Metadata } from 'next';

const SHOP_URL = 'https://xom3.io/shop';
const FEED_URL = 'https://xom3.io/api/shop/feed';

export const metadata: Metadata = {
  title: 'XOM3 Shop - Digital Products & AI Marketplace',
  description:
    'Discover unique digital products, templates, courses, AI tools, and services. AI-powered marketplace with secure checkout and instant delivery.',
  keywords: [
    'digital products',
    'AI marketplace',
    'online marketplace',
    'templates',
    'courses',
    'AI tools',
    'e-commerce',
    'XOM3',
    'SpaceBaddie',
  ],
  openGraph: {
    title: 'XOM3 Shop - Digital Products & AI Marketplace',
    description:
      'Discover unique digital products, templates, courses, and AI tools from creators worldwide.',
    type: 'website',
    siteName: 'XOM3',
    locale: 'en_US',
    url: SHOP_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XOM3 Shop - Digital Products & AI Marketplace',
    description:
      'Discover unique digital products, templates, courses, and AI tools.',
  },
  alternates: {
    canonical: SHOP_URL,
  },
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `${SHOP_URL}#store`,
    name: 'XOM3 Shop',
    description: 'Digital products and AI marketplace powered by XOM3. Templates, courses, AI tools, and services with instant delivery.',
    url: SHOP_URL,
    // Machine-readable product list for AI crawlers and aggregators
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'XOM3 Shop Products',
      url: FEED_URL,
      numberOfItems: 0,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SHOP_URL}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
    brand: {
      '@type': 'Brand',
      name: 'XOM3',
      url: 'https://xom3.io',
    },
  };

  return (
    <>
      <link rel="alternate" type="application/ld+json" href={FEED_URL} title="Product feed (JSON-LD)" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
