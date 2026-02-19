"use client";

import { useState } from "react";
import { OperatorPanelFrame, PostureChip } from "@/app/operator/dashboard/components/OperatorDashboardPanelKit";
import { SocialPlatform } from "@/lib/social/types";
import { MediaUpload } from "@/app/components/ui/akv/primitives/MediaUpload";

export default function PostComposerPanel() {
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState<SocialPlatform>("twitter");
  const [scheduledAt, setScheduledAt] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleFileSelect = (file: File) => {
    setMediaFiles(prev => [...prev, file]);
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      // Upload media files first if any
      let mediaUrls: string[] = [];
      if (mediaFiles.length > 0) {
        const formData = new FormData();
        mediaFiles.forEach(file => {
          formData.append('media', file);
        });

        const uploadRes = await fetch("/api/social/upload-media", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          mediaUrls = uploadData.urls || [];
        } else {
          setResult({ success: false, message: "Failed to upload media files" });
          setIsSubmitting(false);
          return;
        }
      }

      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          content,
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
          scheduledAt: scheduledAt || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setResult({ success: true, message: "Post created successfully" });
        setContent("");
        setScheduledAt("");
        setMediaFiles([]);
      } else {
        setResult({ success: false, message: json.error || "Failed to create post" });
      }
    } catch (error) {
      setResult({ success: false, message: "Network error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const platforms: SocialPlatform[] = ["twitter", "instagram", "facebook", "linkedin", "tiktok", "youtube"];

  return (
    <OperatorPanelFrame
      title="Post Composer"
      hint="Draft and schedule social content across lanes"
    >
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
            PLATFORM
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {platforms.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: platform === p ? "rgba(255,255,255,0.1)" : "transparent",
                  border: `1px solid ${platform === p ? "var(--text-1)" : "rgba(255,255,255,0.1)"}`,
                  color: platform === p ? "var(--text-0)" : "var(--text-2)",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  transition: "all 0.2s",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
            CONTENT
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's the signal?"
            required
            style={{
              width: "100%",
              minHeight: 120,
              padding: 12,
              borderRadius: 12,
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-0)",
              fontFamily: "inherit",
              fontSize: 14,
              resize: "vertical",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
            MEDIA (OPTIONAL)
          </label>
          <MediaUpload
            onFileSelect={handleFileSelect}
            accept="image/*,video/*"
            maxSizeMB={50}
            label=""
          />

          {mediaFiles.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {mediaFiles.map((file, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.1)",
                    fontSize: 12,
                    color: "var(--text-1)",
                    maxWidth: 200,
                  }}
                >
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(index)}
                    style={{
                      marginLeft: 8,
                      padding: "2px 6px",
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: 4,
                      color: "#ef4444",
                      cursor: "pointer",
                      fontSize: 10,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
              SCHEDULE (OPTIONAL)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--text-0)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="xom3-btn xom3-btnPrimary"
              style={{ width: "100%" }}
            >
              {isSubmitting ? "Processing…" : scheduledAt ? "Schedule Post" : "Draft Post"}
            </button>
          </div>
        </div>

        {result && (
          <div style={{ marginTop: 8 }}>
            <PostureChip
              label={result.message}
              tone={result.success ? "ok" : "error"}
            />
          </div>
        )}
      </form>
    </OperatorPanelFrame>
  );
}

