#!/bin/bash

# HI5 Dashboard Vercel Deployment Script
# This deploys only the HI5 routes to a separate Vercel project

echo "🚀 Deploying HI5 Dashboard to Vercel..."
echo "========================================"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install with: npm i -g vercel"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "vercel.hi5.json" ]; then
    echo "❌ vercel.hi5.json not found. Run this script from the xom3-app directory."
    exit 1
fi

# Deploy with HI5-specific configuration
echo "📦 Deploying with HI5 configuration..."
vercel --prod --yes --local-config=vercel.hi5.json

echo "✅ HI5 Dashboard deployment complete!"
echo "=========================================="
echo "🌐 Your HI5 dashboard should now be live at:"
echo "   https://hi5-dashboard.vercel.app"
echo ""
echo "📋 Next steps:"
echo "   1. Add environment variables in Vercel dashboard"
echo "   2. Configure domain (optional)"
echo "   3. Test all HI5 routes work correctly"




