import { Metadata } from 'next';
import SpaceBaddieClientPage from './page.client';

export const metadata: Metadata = {
  title: 'SpaceBaddie - Sacred Content Creation Chamber',
  description: 'Transform vision into reality through divine automation. Neural camera controls, quantum video synthesis, and multi-dimensional broadcasting for creators.',
  keywords: 'content creation, video production, AI avatars, social media automation, neural controls, quantum synthesis, multi-platform broadcasting',
  openGraph: {
    title: 'SpaceBaddie - Sacred Content Creation Chamber',
    description: 'Transform vision into reality through divine automation. Neural camera controls, quantum video synthesis, and multi-dimensional broadcasting.',
    url: 'https://spacebaddie.com',
    siteName: 'SpaceBaddie',
    images: [
      {
        url: 'https://spacebaddie.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'SpaceBaddie - Sacred Content Creation Chamber'
      }
    ],
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceBaddie - Sacred Content Creation Chamber',
    description: 'Transform vision into reality through divine automation. Neural camera controls, quantum video synthesis, and multi-dimensional broadcasting.',
    images: ['https://spacebaddie.com/og-image.jpg'],
    creator: '@spacebaddie',
    site: '@spacebaddie'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  authors: [{ name: 'SpaceBaddie Team' }],
  creator: 'SpaceBaddie',
  publisher: 'SpaceBaddie',
  formatDetection: {
    email: false,
    address: false,
    telephone: false
  }
};

export default function SpaceBaddiePage() {
  return <SpaceBaddieClientPage />;
}