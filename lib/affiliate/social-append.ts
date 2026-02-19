/**
 * Social Broadcast Affiliate Link Appender
 *
 * Auto-appends affiliate links to social media posts.
 * Used by the SpaceBaddie posting system to inject affiliate tracking.
 */

const LINK_TEMPLATES: Record<string, string> = {
  youtube: '\n\nShop here: {url}',
  tiktok: '\n\n{url}',
  instagram: '\n\nLink in bio: {url}',
  twitter: '\n\n{url}',
  facebook: '\n\nCheck it out: {url}',
  linkedin: '\n\nLearn more: {url}',
};

/**
 * Append an affiliate link to a social post's content text.
 * Only appends if the content doesn't already contain a ref link.
 */
export function appendAffiliateLink(
  content: string,
  affiliateUrl: string,
  platform: string,
): string {
  if (!affiliateUrl || !content) return content;
  if (content.includes('ref=') || content.includes(affiliateUrl)) return content;

  const template = LINK_TEMPLATES[platform] || LINK_TEMPLATES.twitter;
  return content + template.replace('{url}', affiliateUrl);
}

/**
 * Check if a post already has an affiliate link
 */
export function hasAffiliateLink(content: string): boolean {
  return content.includes('ref=');
}
