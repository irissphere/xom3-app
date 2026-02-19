import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Public Shop API - Get single product details
 * No authentication required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: product, error } = await supabaseAdmin
      .from('spacebaddie_products')
      .select(`
        id,
        name,
        description,
        price,
        image_url,
        category,
        user_id,
        created_at,
        inventory_count
      `)
      .eq('id', id)
      .eq('status', 'active')
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get seller info
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('display_name')
      .eq('user_id', product.user_id)
      .single();

    return NextResponse.json({
      product: {
        ...product,
        seller_name: profile?.display_name || 'Creator',
      },
    });
  } catch (error) {
    console.error('[Shop API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
