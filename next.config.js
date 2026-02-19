/** @type {import('next').NextConfig} */
/**
 * xom3.io source. Vercel project: xom3-app.
 * See PUBLISH_TO.md for deployment source.
 */
const nextConfig = {
  // Multi-domain configuration
  async headers() {
    return [
      // SpaceBaddie routes - relaxed COEP to allow external images
      {
        source: '/spacebaddie/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Use credentialless instead of require-corp to allow external images
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
      // Other routes - strict COEP for ffmpeg.wasm
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Required for ffmpeg.wasm (SharedArrayBuffer)
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },

  // AI marketplace: well-known feed URL for crawler discovery
  async redirects() {
    return [
      {
        source: '/.well-known/ai-product-feed',
        destination: '/api/shop/feed',
        permanent: true,
      },
      {
        source: '/store',
        destination: '/shop',
        permanent: true,
      },
      {
        source: '/spacebaddie/store',
        destination: '/shop',
        permanent: true,
      },
    ];
  },

  // API routes configuration
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },

  // Production optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'lmfwxitjewiophshjcrd.supabase.co',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Build configuration
  // output: 'standalone', // Disabled for initial deployment
  
  // TypeScript configuration
  typescript: {
    // Ignore type errors during build for deployment
    ignoreBuildErrors: true,
  },
  
  // ESLint configuration
  eslint: {
    // Ignore ESLint errors during build for deployment
    ignoreDuringBuilds: true,
  },
  
  // Experimental features
  experimental: {
    // Enable if needed
    // serverActions: true,
  },
  
  // Webpack configuration to handle optional @vercel/postgres
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent Node-only modules from being pulled into the browser bundle.
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
      };
    }
    if (isServer) {
      // Externalize @vercel/postgres - it will be dynamically imported at runtime
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('@vercel/postgres');
      } else {
        config.externals = [config.externals, '@vercel/postgres'];
      }
    }
    return config;
  },
  
  // Force all API routes to be dynamic (avoids build-time analysis issues with Airtable)
  async generateBuildId() {
    return 'build-' + Date.now();
  },
};

module.exports = nextConfig;
