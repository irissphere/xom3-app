import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { stripHtml } from '@/lib/commerce/html-utils';

const STORE_URL = 'https://shop.spacebaddie.com';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const supabase = getSupabase();
    const { data: product } = await supabase
      .from('spacebaddie_products')
      .select('id, name, description, price, image_url, category, user_id')
      .eq('id', id)
      .single();

    if (!product) {
      return { title: 'Product Not Found | SpaceBaddie Shop' };
    }

    let sellerName = 'Creator';
    if (product.user_id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', product.user_id)
        .single();
      sellerName = profile?.display_name || 'Creator';
    }

    const cleanName = stripHtml(product.name);
    const title = `${cleanName} | SpaceBaddie Shop`;
    const description = product.description
      ? stripHtml(product.description).slice(0, 155)
      : `Get ${cleanName} for $${product.price?.toFixed(2)} on SpaceBaddie Shop. Instant delivery, secure checkout.`;
    const url = `${STORE_URL}/${product.id}`;

    return {
      title,
      description,
      keywords: [
        cleanName,
        product.category,
        'digital product',
        'SpaceBaddie',
        sellerName,
      ].filter(Boolean),
      openGraph: {
        title,
        description,
        url,
        type: 'website',
        siteName: 'SpaceBaddie Shop',
        images: product.image_url
          ? [{ url: product.image_url, width: 1200, height: 630, alt: cleanName }]
          : [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: product.image_url ? [product.image_url] : [],
      },
      alternates: {
        canonical: url,
      },
      other: {
        'product:price:amount': product.price?.toString() || '',
        'product:price:currency': 'USD',
      },
    };
  } catch {
    return { title: 'SpaceBaddie Shop' };
  }
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
