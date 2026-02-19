import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const getSupabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

// GET all products (admin view - includes drafts)
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    let query = supabase
      .from('spacebaddie_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('[Commerce Products] Error:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, products: products || [] });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// POST create new product
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getSupabaseAdmin();

    // Build insert object dynamically -- only include user_id if provided
    // (the column may have a NOT NULL constraint until migration is applied)
    const insertData: Record<string, any> = {
      name: body.name,
      description: body.description || '',
      price: body.price || 0,
      category: body.category || 'Other',
      status: body.status || 'active',
      image_url: body.image_url || null,
      inventory_count: body.inventory_count ?? -1,
      sku: body.sku || null,
      shipping_required: body.shipping_required || false,
      product_type: body.product_type || 'physical',
    };

    // Only include user_id if provided (avoids NOT NULL violation when no auth)
    if (body.user_id) {
      insertData.user_id = body.user_id;
    }

    const { data: product, error } = await supabase
      .from('spacebaddie_products')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // If user_id NOT NULL constraint fails, provide actionable guidance
      if (error.message.includes('user_id') && error.message.includes('not-null')) {
        console.error('[Commerce Products] user_id NOT NULL constraint. Run: ALTER TABLE spacebaddie_products ALTER COLUMN user_id DROP NOT NULL;');
        return NextResponse.json({
          ok: false,
          error: 'Database requires user_id migration. Run this SQL in Supabase Dashboard: ALTER TABLE spacebaddie_products ALTER COLUMN user_id DROP NOT NULL;',
          migration_required: true,
        }, { status: 500 });
      }
      console.error('[Commerce Products] Create error:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, product });
  } catch (error: any) {
    console.error("Error creating product:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
