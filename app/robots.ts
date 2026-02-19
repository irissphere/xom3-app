import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // AI marketplace crawlers: allow product feed for ChatGPT, Google AI, etc.
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'Google-Extended'],
        allow: ['/', '/api/shop/feed'],
        disallow: ['/api/', '/admin/', '/operator/'],
      },
      {
        userAgent: '*',
        allow: ['/', '/api/shop/feed'],
        disallow: ['/api/', '/admin/', '/operator/'],
      },
    ],
    sitemap: 'https://xom3.io/sitemap.xml',
    host: 'https://xom3.io',
  };
}

