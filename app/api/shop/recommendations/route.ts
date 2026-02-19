/**
 * Smart Product Recommendations API
 * GET /api/shop/recommendations?product_id=xxx&category=xxx&limit=4
 * 
 * Returns related products based on category similarity,
 * price range proximity, and recency. Powers upsells and
 * "you may also like" sections.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const getSupabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

export async function GET(req: NextRequest) {
  try {
    const productId = req.nextUrl.searchParams.get('product_id');
    const category = req.nextUrl.searchParams.get('category');
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '4'), 12);

    const supabase = getSupabaseAdmin();

    // Strategy: Get products in same category first, then fill with popular products
    let recommendations: any[] = [];

    // 1. Same category products (excluding current product)
    if (category) {
      const { data: sameCat } = await supabase
        .from('spacebaddie_products')
        .select('id, name, price, image_url, category, description, seller_name, created_at')
        .eq('category', category)
        .eq('status', 'active')
        .neq('id', productId || '')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (sameCat) {
        recommendations = sameCat;
      }
    }

    // 2. If we need more, grab popular/recent products from other categories
    if (recommendations.length < limit) {
      const excludeIds = [productId, ...recommendations.map(r => r.id)].filter(Boolean);
      const remaining = limit - recommendations.length;

      const { data: others } = await supabase
        .from('spacebaddie_products')
        .select('id, name, price, image_url, category, description, seller_name, created_at')
        .eq('status', 'active')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(remaining);

      if (others) {
        recommendations = [...recommendations, ...others];
      }
    }

    // Transform for frontend
    const products = recommendations.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image_url: p.image_url,
      category: p.category,
      description: p.description?.slice(0, 120) || null,
      seller_name: p.seller_name,
    }));

    return NextResponse.json({ ok: true, products });
  } catch (error: any) {
    console.error('[Recommendations] Error:', error);
    return NextResponse.json({ ok: false, products: [] });
  }
}
