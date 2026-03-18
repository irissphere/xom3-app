import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

/**
 * Public Shop API - Returns all active products
 * No authentication required - this is the public storefront
 * 
 * Query params:
 * - seller: (optional) filter by seller user_id
 * - category: (optional) filter by category
 * - limit: (optional) max number of products (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const seller = searchParams.get('seller');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
      .from('spacebaddie_products')
      .select(`
        id,
        name,
        description,
        price,
        image_url,
        category,
        user_id,
        inventory_count,
        created_at
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by seller if provided
    if (seller) {
      query = query.eq('user_id', seller);
    }

    // Filter by category if provided
    if (category) {
      query = query.eq('category', category);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('[Shop API] Error fetching products:', error);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }

    // Get seller info for products
    const userIds = Array.from(new Set(products?.map(p => p.user_id) || []));
    let sellers: Record<string, { display_name: string | null }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      if (profiles) {
        sellers = profiles.reduce((acc, p) => {
          acc[p.user_id] = { display_name: p.display_name };
          return acc;
        }, {} as Record<string, { display_name: string | null }>);
      }
    }

    // Enrich products with seller info
    const enrichedProducts = (products || []).map(product => ({
      ...product,
      seller_name: sellers[product.user_id]?.display_name || 'Creator',
    }));

    return NextResponse.json({
      products: enrichedProducts,
      total: enrichedProducts.length,
    });
  } catch (error) {
    console.error('[Shop API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
