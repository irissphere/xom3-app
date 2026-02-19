/**
 * Cart API
 * GET - Get current user's cart
 * POST - Add item to cart
 * PUT - Update cart item quantity
 * DELETE - Remove item from cart or clear cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

// Helper to get user from request
async function getUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  const supabase = getSupabaseAdmin();
  const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  return user?.id || null;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ items: [], message: 'Not authenticated - use local cart' });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Get cart items joined with product info
    const { data: cartItems, error } = await supabase
      .from('cart_items')
      .select('id, product_id, quantity, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    // Enrich with product details
    if (cartItems && cartItems.length > 0) {
      const productIds = cartItems.map(ci => ci.product_id);
      const { data: products } = await supabase
        .from('spacebaddie_products')
        .select('id, name, price, image_url, category')
        .in('id', productIds);
      
      const productMap = (products || []).reduce((acc: any, p: any) => {
        acc[p.id] = p;
        return acc;
      }, {});
      
      const enriched = cartItems.map(ci => ({
        ...ci,
        name: productMap[ci.product_id]?.name || 'Unknown Product',
        price: productMap[ci.product_id]?.price || 0,
        image_url: productMap[ci.product_id]?.image_url,
        category: productMap[ci.product_id]?.category,
      }));
      
      return NextResponse.json({ items: enriched });
    }
    
    return NextResponse.json({ items: [] });
  } catch (error: any) {
    console.error('[Cart API] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const body = await req.json();
    const { product_id, quantity = 1 } = body;
    
    if (!product_id) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Check if item already in cart
    const { data: existing } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', userId)
      .eq('product_id', product_id)
      .single();
    
    if (existing) {
      // Update quantity
      const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + quantity, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      return NextResponse.json({ ok: true, item: data });
    }
    
    // Insert new item
    const { data, error } = await supabase
      .from('cart_items')
      .insert({ user_id: userId, product_id, quantity })
      .select()
      .single();
    
    if (error) throw error;
    return NextResponse.json({ ok: true, item: data });
  } catch (error: any) {
    console.error('[Cart API] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const body = await req.json();
    const { product_id, quantity } = body;
    
    if (!product_id || typeof quantity !== 'number') {
      return NextResponse.json({ error: 'product_id and quantity required' }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    if (quantity <= 0) {
      // Remove item
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', product_id);
      
      return NextResponse.json({ ok: true, removed: true });
    }
    
    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('product_id', product_id)
      .select()
      .single();
    
    if (error) throw error;
    return NextResponse.json({ ok: true, item: data });
  } catch (error: any) {
    console.error('[Cart API] PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('product_id');
    
    const supabase = getSupabaseAdmin();
    
    if (productId) {
      // Remove specific item
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);
    } else {
      // Clear entire cart
      await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', userId);
    }
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[Cart API] DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
