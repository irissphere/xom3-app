'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase, getCurrentUser, signOut } from '@/lib/supabase/client';

interface HeaderProps {
  transparent?: boolean;
}

export default function SpaceBaddieHeader({ transparent = false }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    loadUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        loadUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    router.push('/spacebaddie');
  };

  const isActive = (path: string) => pathname === path;

  return (
    <header className={`relative z-50 ${transparent ? '' : 'bg-black/50 backdrop-blur-xl border-b border-white/10'}`}>
      <nav className="flex items-center justify-between p-4 md:p-6 max-w-6xl mx-auto">
        {/* Logo */}
        <Link href="/spacebaddie" className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          SpaceBaddie
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link 
            href="/spacebaddie/studio" 
            className={`transition-colors ${isActive('/spacebaddie/studio') ? 'text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Studio
          </Link>
          {user && (
            <Link
              href="/spacebaddie/dashboard"
              className={`transition-colors ${isActive('/spacebaddie/dashboard') ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Dashboard
            </Link>
          )}
          <a 
            href="https://shop.spacebaddie.com" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <span>Shop</span>
            <span className="px-1.5 py-0.5 bg-gradient-to-r from-pink-500 to-purple-500 text-[10px] font-bold rounded text-white">NEW</span>
          </a>
          <Link 
            href="/spacebaddie/pricing" 
            className={`transition-colors ${isActive('/spacebaddie/pricing') ? 'text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Pricing
          </Link>
          
          {loading ? (
            <div className="w-20 h-10 bg-white/10 rounded-lg animate-pulse" />
          ) : user ? (
            <div className="relative">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold">
                  {user.profile?.display_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline text-sm">
                  {user.profile?.display_name || user.email?.split('@')[0]}
                </span>
              </button>
              
              {menuOpen && (
                <>
                  <div className="fixed inset-0" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a2e] border border-white/10 rounded-xl overflow-hidden shadow-xl">
                    <Link 
                      href="/spacebaddie/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 hover:bg-white/5 transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link 
                      href="/spacebaddie/studio"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 hover:bg-white/5 transition-colors"
                    >
                      Create Video
                    </Link>
                    <hr className="border-white/10" />
                    <button 
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-3 text-red-400 hover:bg-white/5 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link 
                href="/spacebaddie/login"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Log In
              </Link>
              <Link 
                href="/spacebaddie/login?plan=pro&trial=true"
                className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                Start Free Trial
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 text-white"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#0a0a0f] border-b border-white/10">
          <div className="p-4 space-y-3">
            <Link 
              href="/spacebaddie/studio"
              onClick={() => setMenuOpen(false)}
              className="block py-2 text-gray-300 hover:text-white transition-colors"
            >
              Studio
            </Link>
            <a 
              href="https://shop.spacebaddie.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 py-2 text-gray-300 hover:text-white transition-colors"
            >
              <span>Shop</span>
              <span className="px-1.5 py-0.5 bg-gradient-to-r from-pink-500 to-purple-500 text-[10px] font-bold rounded text-white">NEW</span>
            </a>
            <Link 
              href="/spacebaddie/pricing"
              onClick={() => setMenuOpen(false)}
              className="block py-2 text-gray-300 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            {user ? (
              <>
                <Link 
                  href="/spacebaddie/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="block py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="block py-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/spacebaddie/login"
                  onClick={() => setMenuOpen(false)}
                  className="block py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Log In
                </Link>
                <Link 
                  href="/spacebaddie/login?plan=pro&trial=true"
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 text-center bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg font-semibold"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
