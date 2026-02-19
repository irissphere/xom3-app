/**
 * Product Image Upload API
 * POST /api/commerce/products/upload
 * 
 * Handles product image uploads and returns URL
 * AKV: Commerce Sovereign - Product Image Lane
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Simple base64 encoding for storing images (in production, use proper storage like S3/Supabase Storage)
const STORAGE_BUCKET = "product-images";

/**
 * POST /api/commerce/products/upload
 * 
 * Accepts multipart form data with 'file' field
 * Returns { ok: true, url: string }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    
    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({
        ok: false,
        error: "No file provided",
      }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({
        ok: false,
        error: "File must be an image",
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({
        ok: false,
        error: "File too large. Maximum size is 5MB.",
      }, { status: 400 });
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${uuidv4()}.${ext}`;
    const path = `${STORAGE_BUCKET}/${filename}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Try to upload to Supabase Storage
    const { data, error: uploadError } = await supabase
      .storage
      .from(STORAGE_BUCKET)
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[Product Upload] Supabase storage error:", uploadError);
      
      // Fallback: return a data URL (not ideal for production)
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;
      
      // Note: Data URLs are not persistent and may cause issues with large images
      // In production, set up Supabase Storage or use S3/Cloudinary
      return NextResponse.json({
        ok: true,
        url: dataUrl,
        warning: "Using data URL fallback. Configure Supabase Storage for persistent images.",
      });
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename);

    return NextResponse.json({
      ok: true,
      url: urlData.publicUrl,
      filename,
    });

  } catch (error: any) {
    console.error("[Product Upload] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error?.message || "Upload failed",
    }, { status: 500 });
  }
}
