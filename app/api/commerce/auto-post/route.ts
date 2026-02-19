/**
 * Product Auto-Post API
 * POST /api/commerce/auto-post
 * 
 * When a new product is added or marked for promotion:
 * 1. Generates AI ad copy using the Ad Engine
 * 2. Schedules social posts across platforms
 * 3. Creates platform-optimized captions (TikTok, Instagram, Twitter/X)
 * 
 * Body: { productId: string, platforms?: string[], scheduledTime?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

interface GeneratedContent {
  platform: string;
  caption: string;
  hashtags: string[];
  callToAction: string;
}

function generateProductCaptions(product: any): GeneratedContent[] {
  const name = product.name || 'New Product';
  const price = product.price ? `$${product.price.toFixed(2)}` : '';
  const category = product.category || 'product';
  const desc = product.description?.slice(0, 80) || '';

  return [
    {
      platform: 'tiktok',
      caption: `POV: You just found "${name}" and your life changed ${desc ? `- ${desc}` : ''} ${price ? `Only ${price}` : ''} Link in bio! #SpaceBaddie #CreatorEconomy #MustHave #${category.replace(/\s+/g, '')}`,
      hashtags: ['SpaceBaddie', 'CreatorEconomy', 'MustHave', category.replace(/\s+/g, ''), 'DigitalProducts', 'TrendingNow'],
      callToAction: 'Link in bio to grab yours',
    },
    {
      platform: 'instagram',
      caption: `NEW DROP: ${name} ${price ? `| ${price}` : ''}\n\n${desc || 'The product you didn\'t know you needed.'}\n\nSecure checkout. Instant delivery. 30-day guarantee.\n\nTap the link in bio to get yours before it\'s gone.\n\n#SpaceBaddie #${category.replace(/\s+/g, '')} #DigitalProducts #NewDrop #CreatorTools`,
      hashtags: ['SpaceBaddie', category.replace(/\s+/g, ''), 'DigitalProducts', 'NewDrop', 'CreatorTools'],
      callToAction: 'Link in bio',
    },
    {
      platform: 'twitter',
      caption: `Just dropped: "${name}" ${price ? `for ${price}` : ''}\n\n${desc || 'The future of creator commerce.'}\n\nGrab it on @SpaceBaddie: https://shop.spacebaddie.com`,
      hashtags: ['SpaceBaddie'],
      callToAction: 'Grab it now',
    },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, platforms = ['tiktok', 'instagram', 'twitter'], scheduledTime } = body;

    if (!productId) {
      return NextResponse.json({ ok: false, error: 'productId required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from('spacebaddie_products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ ok: false, error: 'Product not found' }, { status: 404 });
    }

    // Generate platform-optimized captions
    const captions = generateProductCaptions(product);
    const filteredCaptions = captions.filter(c => platforms.includes(c.platform));

    // Try to use AI Ad Engine for enhanced copy if available
    let aiEnhanced = false;
    try {
      const adRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://xom3.io'}/api/commerce/ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'social-ad',
          productId,
        }),
      });
      const adData = await adRes.json();
      if (adData.ok && adData.result?.ads) {
        aiEnhanced = true;
        // Merge AI-generated copy if available
        for (const caption of filteredCaptions) {
          const aiAd = adData.result.ads.find((a: any) =>
            a.platform?.toLowerCase() === caption.platform
          );
          if (aiAd?.copy) {
            caption.caption = aiAd.copy;
          }
        }
      }
    } catch {
      // AI enhancement is optional — fall back to template captions
    }

    // Schedule posts via the social scheduler
    const scheduleTime = scheduledTime || new Date(Date.now() + 30 * 60 * 1000).toISOString(); // Default: 30min from now
    const scheduledPosts: any[] = [];

    for (const caption of filteredCaptions) {
      try {
        // Insert into scheduled_posts table (used by the social cron processor)
        const { data: post, error: schedError } = await supabase
          .from('scheduled_posts')
          .insert({
            content_type: product.image_url ? 'image' : 'text',
            content_text: caption.caption,
            content_url: product.image_url || null,
            thumbnail_url: product.image_url || null,
            platforms: [caption.platform],
            scheduled_time: scheduleTime,
            status: 'queued',
            tags: ['auto-post', 'product-promotion', product.category],
            source_type: 'auto-post',
            metadata: {
              product_id: productId,
              product_name: product.name,
              product_price: product.price,
              product_url: `https://shop.spacebaddie.com/${productId}`,
              hashtags: caption.hashtags,
              cta: caption.callToAction,
              ai_enhanced: aiEnhanced,
            },
          })
          .select()
          .single();

        if (post) {
          scheduledPosts.push({
            id: post.id,
            platform: caption.platform,
            scheduled_time: scheduleTime,
            caption: caption.caption.slice(0, 100) + '...',
            status: 'queued',
          });
        }
      } catch (err: any) {
        console.error(`[Auto-Post] Failed to schedule ${caption.platform}:`, err.message);
        // If scheduled_posts table doesn't exist, just return the generated captions
        scheduledPosts.push({
          platform: caption.platform,
          caption: caption.caption.slice(0, 100) + '...',
          status: 'generated_only',
        });
      }
    }

    // Mark product metadata with auto-post status
    try {
      const existingMeta = product.metadata || {};
      await supabase
        .from('spacebaddie_products')
        .update({
          metadata: {
            ...existingMeta,
            auto_posted: true,
            auto_posted_at: new Date().toISOString(),
            auto_post_platforms: platforms,
          },
        })
        .eq('id', productId);
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      ok: true,
      product: { id: product.id, name: product.name },
      captions: filteredCaptions,
      scheduled_posts: scheduledPosts,
      ai_enhanced: aiEnhanced,
      scheduled_for: scheduleTime,
    });
  } catch (error: any) {
    console.error('[Auto-Post] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
