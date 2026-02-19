import { Metadata } from 'next';
import { ReactNode } from 'react';

// SpaceBaddie Layout - AI Video Creation Platform
export const metadata: Metadata = {
  metadataBase: new URL('https://spacebaddie.com'),
  title: {
    default: 'SpaceBaddie - AI Video Creation | Pro Videos $29/mo',
    template: '%s | SpaceBaddie',
  },
  description: 'Create stunning AI-powered talking avatar videos starting at $29/month. Professional video content in minutes. Perfect for content creators, influencers, and businesses.',
  applicationName: 'SpaceBaddie',
  icons: {
    icon: '/spacebaddie-logo.svg',
    shortcut: '/spacebaddie-logo.svg',
    apple: '/spacebaddie-logo.svg',
  },
  openGraph: {
    title: 'SpaceBaddie - AI Video Creation',
    description: 'Create stunning AI-powered talking avatar videos. Professional content in minutes. Start free today.',
    siteName: 'SpaceBaddie',
    type: 'website',
    url: 'https://spacebaddie.com',
    images: [
      {
        url: '/spacebaddie-logo.svg',
        width: 1200,
        height: 630,
        alt: 'SpaceBaddie - AI Video Creation Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceBaddie - AI Video Creation',
    description: 'Create stunning AI-powered talking avatar videos. Professional content in minutes.',
    images: ['/spacebaddie-logo.svg'],
  },
};

export default function SpaceBaddieLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0a0f 0%, #1a0a2e 50%, #0a0a0f 100%)' 
    }}>
      {children}
    </div>
  );
}