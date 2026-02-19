/**
 * Utilities for safely displaying product names and descriptions
 * that may contain HTML from CJ Dropshipping or other suppliers.
 * Uses sanitize-html (no jsdom) to avoid Vercel build ENOENT on default-stylesheet.css.
 */
import sanitizeHtml from "sanitize-html";
import { isCjCdnImageUrl } from "./cj-image";

/** Strip all HTML tags and decode entities to plain text. */
export function stripHtml(str: string | null | undefined): string {
  if (str == null || typeof str !== "string") return "";
  return str
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Rewrite img src attributes in HTML to use the cj-image proxy for CJ/Aliyun CDN URLs.
 * Call after sanitizeDescriptionHtml so embedded product images load correctly.
 */
export function rewriteDescriptionImageUrls(html: string | null | undefined): string {
  if (html == null || typeof html !== "string") return "";
  return html.replace(
    /<img([^>]*?)src=["']([^"']+)["']([^>]*)>/gi,
    (match, before, url, after) => {
      if (isCjCdnImageUrl(url)) {
        const proxyUrl = `/api/commerce/cj-image?url=${encodeURIComponent(url)}`;
        return `<img${before}src="${proxyUrl}"${after}>`;
      }
      return match;
    }
  );
}

/** Sanitize HTML for safe rendering with dangerouslySetInnerHTML. */
export function sanitizeDescriptionHtml(html: string | null | undefined): string {
  if (html == null || typeof html !== "string") return "";
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "b",
      "i",
      "ul",
      "ol",
      "li",
      "h2",
      "h3",
      "img",
    ],
    allowedAttributes: {
      img: ["src", "style", "alt"],
    },
  });
}
