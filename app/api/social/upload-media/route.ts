// Social Media Upload API
// AKV: Handle media file uploads for social posts

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "social");

/**
 * POST /api/social/upload-media
 * Upload media files for social posts
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("media") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No media files provided" },
        { status: 400 }
      );
    }

    // Validate files
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/quicktime"];

    for (const file of files) {
      if (file.size > maxFileSize) {
        return NextResponse.json(
          { success: false, error: `File ${file.name} exceeds 50MB limit` },
          { status: 400 }
        );
      }

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: `File ${file.name} has unsupported type: ${file.type}` },
          { status: 400 }
        );
      }
    }

    // Ensure upload directory exists
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
      console.warn("Upload directory creation failed:", error);
    }

    // Upload files
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const fileExtension = file.name.split(".").pop()?.toLowerCase() || "unknown";
      const fileName = `${randomUUID()}.${fileExtension}`;
      const filePath = join(UPLOAD_DIR, fileName);

      // Convert file to buffer and save
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      await writeFile(filePath, buffer);

      // Generate public URL
      const publicUrl = `/uploads/social/${fileName}`;
      uploadedUrls.push(publicUrl);
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      count: uploadedUrls.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error("[Social Upload] Error:", error);
    return NextResponse.json(
      { success: false, error: "Upload failed" },
      { status: 500 }
    );
  }
}












