import { MetadataRoute } from 'next';
import { headers } from 'next/headers';

/**
 * Dynamic manifest.json generation based on domain
 * 
 * XOM3 domains: /manifest.json serves XOM3 branding
 * SpaceBaddie domains: /manifest.json serves SpaceBaddie branding
 * 
 * This ensures the PWA manifest is always available and domain-appropriate.
 */
export default function manifest(): MetadataRoute.Manifest {
  // Check host header to determine which manifest to serve
  const headersList = headers();
  const host = headersList.get('host') || '';
  const isSpaceBaddie = host.includes('spacebaddie');

  if (isSpaceBaddie) {
    return {
      name: 'SpaceBaddie Studio',
      short_name: 'SpaceBaddie',
      description: 'Create unlimited AI-powered talking avatar videos',
      start_url: '/spacebaddie',
      scope: '/',
      display: 'standalone',
      background_color: '#1A1A2E',
      theme_color: '#FF006E',
      icons: [
        {
          src: '/spacebaddie/icon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any',
        },
      ],
    };
  }

  // Default XOM3 manifest
  return {
    name: 'XOM3',
    short_name: 'XOM3',
    description: 'AI-Powered Business Automation Platform',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#050810',
    theme_color: '#050810',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
