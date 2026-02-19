/**
 * Unified product categories for the XOM3 commerce platform.
 * Single source of truth — imported by shop pages, product forms,
 * AI prompts, trend research, and the recommendation engine.
 */

export const PRODUCT_CATEGORIES = [
  // Digital
  "AI Tools",
  "Digital",
  "Templates",
  "Courses",
  "Services",
  "Software",
  // Physical - Dropshipping
  "Electronics",
  "Fashion",
  "Beauty",
  "Health & Wellness",
  "Home & Garden",
  "Kitchen",
  "Pet Supplies",
  "Fitness",
  "Toys & Games",
  "Baby & Kids",
  "Automotive",
  "Jewelry & Accessories",
  "Outdoor & Sports",
  "Office",
  // Catch-all
  "Other",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Categories prefixed with "All" — for filter UIs (shop page, etc.) */
export const SHOP_FILTER_CATEGORIES = ["All", ...PRODUCT_CATEGORIES] as const;

/** Comma-separated string for use inside AI / OpenAI prompts */
export const CATEGORIES_FOR_PROMPT = PRODUCT_CATEGORIES.join(", ");
