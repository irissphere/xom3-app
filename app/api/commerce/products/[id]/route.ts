import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const getSupabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

// GET single product
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = getSupabaseAdmin();
    const { data: product, error } = await supabase
      .from('spacebaddie_products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { ok: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, product });
  } catch (error: any) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT update product
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const supabase = getSupabaseAdmin();

    // Only allow updating known commerce fields
    const allowedFields: Record<string, any> = {};
    const editableKeys = [
      'name', 'description', 'price', 'category', 'status',
      'image_url', 'inventory_count', 'sku', 'shipping_required',
      'weight_grams', 'metadata', 'product_type', 'digital_file_url',
    ];
    for (const key of editableKeys) {
      if (body[key] !== undefined) {
        allowedFields[key] = body[key];
      }
    }

    const { data: product, error } = await supabase
      .from('spacebaddie_products')
      .update(allowedFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Commerce Products] Update error:', error);
      return NextResponse.json(
        { ok: false, error: error.message || "Failed to update product" },
        { status: 500 }
      );
    }

    if (!product) {
      return NextResponse.json(
        { ok: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, product });
  } catch (error: any) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE product
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('spacebaddie_products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Commerce Products] Delete error:', error);
      return NextResponse.json(
        { ok: false, error: error.message || "Failed to delete product" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, deleted: true });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
