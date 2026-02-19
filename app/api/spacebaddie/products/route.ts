import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Service role client for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Create a Supabase client for API route handlers
 */
async function createSupabaseRouteClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Ignore
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Ignore
          }
        },
      },
    }
  );
}

/**
 * Get authenticated user ID
 */
async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createSupabaseRouteClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

/**
 * GET /api/spacebaddie/products
 * List products for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: products, error } = await supabaseAdmin
      .from('spacebaddie_products')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Products API] Error fetching products:', error);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }

    return NextResponse.json({ products: products || [] });
  } catch (error) {
    console.error('[Products API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/spacebaddie/products
 * Create a new product
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, price, category, image_url, status = 'draft' } = body;

    // Validate required fields
    if (!name || typeof price !== 'number') {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      );
    }

    const { data: product, error } = await supabaseAdmin
      .from('spacebaddie_products')
      .insert({
        user_id: userId,
        name,
        description: description || null,
        price,
        category: category || 'Digital',
        image_url: image_url || null,
        status,
        sales: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Products API] Error creating product:', error);
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      );
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('[Products API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
