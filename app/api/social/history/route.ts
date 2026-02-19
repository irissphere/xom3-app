import { NextResponse } from "next/server";
import { getPosts, getVideos } from "@/lib/social/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePublishedAt(item: any): number {
  const publishedAt = item?.publishedAt && Number.isFinite(Date.parse(item.publishedAt)) ? Date.parse(item.publishedAt) : null;
  if (publishedAt) return publishedAt;
  return item?.createdAt && Number.isFinite(Date.parse(item.createdAt)) ? Date.parse(item.createdAt) : Date.now();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || "10") || 10));

  const posts = getPosts().filter((p) => p.status === "published");
  const videos = getVideos().filter((v) => v.status === "published");

  const items = [...posts.map((p) => ({ kind: "post", ...p })), ...videos.map((v) => ({ kind: "video", ...v }))]
    .sort((a, b) => normalizePublishedAt(b) - normalizePublishedAt(a))
    .slice(0, limit)
    .map((i: any) => ({
      id: i.id,
      kind: i.kind,
      platform: i.kind === "video" ? "youtube" : i.platform,
      title: i.kind === "video" ? i.title : null,
      content: i.kind === "post" ? i.content : null,
      link: i.platformLink || i.youtubeLink || i.link || null,
      publishedAt: i.publishedAt || null,
      createdAt: i.createdAt,
      clientName: i.clientName || null,
    }));

  return NextResponse.json(
    { ok: true, total: items.length, items, timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
