import type { OutboundItem, OutboundPlatform } from "./types";
import { createPost, updatePost } from "@/lib/social/store";
import type { SocialPlatform } from "@/lib/social/types";
import { emitPostCreated, emitPostPublished, emitPostFailed } from "@/lib/social/signals";

function toSocialPlatform(p: OutboundPlatform): SocialPlatform | null {
  if (p === "generic") return null;
  return p as SocialPlatform;
}

export async function dispatchOutboundItem(item: OutboundItem): Promise<{ ok: true; externalId: string } | { ok: false; errorCode: string }> {
  // Truthful demo connector: persists into the Social lane store (text-only).
  const socialPlatform = toSocialPlatform(item.platform);
  if (!socialPlatform) {
    return { ok: true, externalId: `ext_generic_${Date.now()}` };
  }

  try {
    const post = createPost({
      platform: socialPlatform,
      content: item.formattedText,
      status: "published",
      publishedAt: new Date().toISOString(),
      createdBy: "operator",
    });
    emitPostCreated(post);
    emitPostPublished(post);
    // Ensure platform-like identifiers exist for downstream UI.
    updatePost(post.id, { platformPostId: post.platformPostId || `sim_${post.id}`, platformLink: post.platformLink || `https://example.com/${socialPlatform}/${post.id}` });
    return { ok: true, externalId: post.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "dispatch_failed";
    try {
      const failed = createPost({
        platform: socialPlatform,
        content: item.formattedText,
        status: "failed",
        errorMessage: msg,
        createdBy: "operator",
      });
      emitPostFailed(failed, msg);
    } catch {
      // ignore nested failures
    }
    return { ok: false, errorCode: "dispatch_failed" };
  }
}
