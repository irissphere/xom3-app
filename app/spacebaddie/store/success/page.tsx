'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-pink-950 to-black flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-2xl shadow-green-500/30">
          <svg 
            className="w-12 h-12 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={3} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
        </div>

        {/* Message */}
        <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
          Order Confirmed!
        </h1>
        <p className="text-lg text-pink-200 mb-8">
          Thank you for your purchase. Your SpaceBaddie merch is on its way!
        </p>

        {/* Order Details Box */}
        <div className="bg-black/40 backdrop-blur-xl border border-pink-500/20 rounded-2xl p-6 mb-8">
          <div className="text-sm text-pink-300 mb-2">Order Reference</div>
          <div className="font-mono text-white text-sm break-all">
            {sessionId || 'Processing...'}
          </div>
          <p className="text-xs text-pink-200/70 mt-4">
            A confirmation email has been sent to your inbox with tracking details.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Link
            href="/commerce"
            className="block w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl font-semibold hover:from-pink-700 hover:to-purple-700 transition-all shadow-lg shadow-pink-500/30"
          >
            Continue Shopping
          </Link>
          <Link
            href="/spacebaddie"
            className="block w-full py-4 bg-white/10 border border-pink-500/30 text-pink-200 rounded-xl font-semibold hover:bg-pink-500/10 transition-all"
          >
            Back to SpaceBaddie
          </Link>
        </div>

        {/* Support Note */}
        <p className="text-sm text-pink-200/60 mt-8">
          Questions about your order? Contact us at{' '}
          <a href="mailto:support@spacebaddie.com" className="text-pink-300 hover:text-pink-200">
            support@spacebaddie.com
          </a>
        </p>
      </div>
    </div>
  );
}

export default function StoreSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-pink-950 to-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
