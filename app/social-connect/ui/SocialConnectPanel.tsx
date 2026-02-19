// Social Connect Panel Component
// AKV: Clean, sovereign, zero-drift

"use client";

import { useState, useEffect } from "react";

interface PlatformConnection {
  platform: string;
  status: 'connected' | 'disconnected' | 'expired' | 'error';
  platformUsername?: string;
  platformDisplayName?: string;
  platformProfileImage?: string;
  connectedAt?: string;
  lastUsedAt?: string;
  expiresAt?: string;
  errorMessage?: string;
}

const PLATFORM_CONFIGS = {
  youtube: {
    name: "YouTube",
    icon: "▶️",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    description: "Upload videos and track analytics"
  },
  twitter: {
    name: "Twitter / X",
    icon: "𝕏",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    description: "Post tweets and engage with followers"
  },
  instagram: {
    name: "Instagram",
    icon: "📸",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    description: "Publish posts, reels, and stories"
  },
  facebook: {
    name: "Facebook",
    icon: "📘",
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
    description: "Post to pages and track engagement"
  },
  linkedin: {
    name: "LinkedIn",
    icon: "💼",
    color: "text-blue-700",
    bgColor: "bg-blue-700/10",
    description: "Share professional content"
  },
  tiktok: {
    name: "TikTok",
    icon: "🎵",
    color: "text-black",
    bgColor: "bg-gray-500/10",
    description: "Upload and publish videos"
  }
};

export function SocialConnectPanel() {
  return (
    <div style={{ padding: "20px", color: "white" }}>
      <h2 style={{ marginBottom: "20px", fontSize: "24px" }}>Social Platform Connections</h2>
      <p style={{ marginBottom: "20px", color: "#94a3b8" }}>
        Connect your social media accounts for automated posting.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "20px"
      }}>
        {["twitter", "instagram", "facebook", "linkedin", "tiktok", "youtube"].map(platform => (
          <div
            key={platform}
            style={{
              padding: "20px",
              background: "rgba(30, 41, 59, 0.5)",
              border: "1px solid rgba(71, 85, 105, 0.3)",
              borderRadius: "12px"
            }}
          >
            <h3 style={{
              marginBottom: "10px",
              fontSize: "18px",
              textTransform: "capitalize"
            }}>
              {platform}
            </h3>
            <p style={{ marginBottom: "15px", color: "#94a3b8", fontSize: "14px" }}>
              Connect to {platform} for automated posting
            </p>

            <button
              style={{
                width: "100%",
                padding: "10px 20px",
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                color: "white",
                cursor: "pointer",
                fontSize: "14px"
              }}
              onClick={() => window.location.href = `/api/oauth/${platform}/authorize`}
            >
              Connect {platform}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
