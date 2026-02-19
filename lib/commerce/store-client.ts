/**
 * Store Client for XOM3 Commerce
 * Now backed by Supabase (spacebaddie_products table)
 */

import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

export interface StoreStats {
  currency: string;
  totalSales: string;
  orderCount: number;
  averageOrderValue: string;
  productCount: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock?: number;
  inventory_count?: number;
  category: string;
  image_url?: string;
  status?: string;
}

export async function getStoreStats(): Promise<StoreStats | null> {
  try {
    const supabase = getSupabaseAdmin();

    // Get product count (all products so hub matches catalog)
    const { count: productCount } = await supabase
      .from('spacebaddie_products')
      .select('*', { count: 'exact', head: true });

    // Get order stats
    const { data: orders } = await supabase
      .from('orders')
      .select('total_cents');

    const orderCount = orders?.length || 0;
    const totalCents = orders?.reduce((sum, o) => sum + (o.total_cents || 0), 0) || 0;
    const totalSales = (totalCents / 100).toFixed(2);
    const averageOrderValue = orderCount > 0 ? (totalCents / orderCount / 100).toFixed(2) : '0.00';

    return {
      currency: 'USD',
      totalSales,
      orderCount,
      averageOrderValue,
      productCount: productCount || 0,
    };
  } catch (error) {
    console.error('Store client error:', error);
    return null;
  }
}

export async function getProducts(): Promise<Product[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('spacebaddie_products')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch products:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return [];
  }
}
