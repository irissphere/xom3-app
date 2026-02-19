/**
 * Client-side helper: use proxy only for CJ/Aliyun CDN URLs.
 * Other hosts (e.g. Supabase Storage) should load directly to avoid 403 from proxy.
 */
const CJ_CDN_HOST_PATTERNS = [
  'aliyuncs.com',
  'alicdn.com',
  'cjdropshipping.com',
  'cjdropship.com',
  'aliyun.com',
  'alibaba.com',
  'mmcdn.com',
  'supabase.co',
];

/** Normalize protocol-relative URLs (//domain.com) to https: */
function normalizeImageUrl(url: string): string {
  if (typeof url !== 'string' || !url.trim()) return url;
  const trimmed = url.trim();
  if (trimmed.startsWith('//')) return 'https:' + trimmed;
  return trimmed;
}

export function isCjCdnImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const normalized = normalizeImageUrl(url);
  try {
    const host = new URL(normalized).hostname.toLowerCase();
    return CJ_CDN_HOST_PATTERNS.some(
      (p) => host === p || host.endsWith('.' + p)
    );
  } catch {
    return false;
  }
}

export function getShopImageSrc(imageUrl: string | null | undefined): string {
  if (!imageUrl) return '';
  const normalized = normalizeImageUrl(imageUrl);
  return isCjCdnImageUrl(normalized)
    ? `/api/commerce/cj-image?url=${encodeURIComponent(normalized)}`
    : normalized;
}
