/**
 * CJ Dropshipping Integration Service
 *
 * Handles product search, import, and order placement via CJ Dropshipping API.
 * API docs: https://developers.cjdropshipping.com/
 *
 * Required env vars:
 *   CJ_API_KEY - Either:
 *     (1) API Key from CJ dashboard (format: CJUserNum@api@xxx) - we exchange for access token
 *     (2) Access token from POST /authentication/getAccessToken (expires in 15 days)
 */

const CJ_BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1";

// In-memory cache for access token (API key → token exchange). Survives within a serverless instance.
let tokenCache: { token: string; expiresAt: number } | null = null;

/** Returns true if value looks like CJ API Key (CJUserNum@api@xxx), false if likely an access token */
function isCJApiKey(value: string): boolean {
  return value.includes("@api@");
}

/**
 * Resolve CJ_API_KEY to a valid access token. Supports both:
 * - API Key (CJUserNum@api@xxx): exchanges for access token via getAccessToken
 * - Access Token: used directly (user must refresh every 15 days)
 */
async function getCJAccessToken(): Promise<string> {
  const key = process.env.CJ_API_KEY;
  if (!key || !key.trim()) throw new Error("CJ_API_KEY not configured");

  if (!isCJApiKey(key)) {
    // Already an access token; use directly
    return key.trim();
  }

  // API key format: exchange for access token
  const now = Date.now();
  const bufferMs = 60 * 60 * 1000; // 1 hour buffer before expiry
  if (tokenCache && tokenCache.expiresAt > now + bufferMs) {
    return tokenCache.token;
  }

  const res = await fetch(`${CJ_BASE_URL}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: key.trim() }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.result !== true || !data.data?.accessToken) {
    const msg = data.message || data.code || res.statusText;
    throw new Error(`CJ getAccessToken failed: ${msg}`);
  }

  const expiresAt = data.data.accessTokenExpiryDate
    ? new Date(data.data.accessTokenExpiryDate).getTime()
    : now + 14 * 24 * 60 * 60 * 1000; // 14 days fallback

  tokenCache = { token: data.data.accessToken, expiresAt };
  return tokenCache.token;
}

async function getCJHeaders(): Promise<Record<string, string>> {
  const token = await getCJAccessToken();
  return {
    "Content-Type": "application/json",
    "CJ-Access-Token": token,
  };
}

export interface CJProduct {
  pid: string;
  name: string;
  description: string;
  image: string;
  sellPrice: number;
  sourcePrice: number;
  category: string;
  variants: CJVariant[];
}

export interface CJVariant {
  vid: string;
  name: string;
  price: number;
  sku: string;
  image?: string;
}

export interface CJOrderResult {
  orderId: string;
  orderNumber: string;
  status: string;
  trackingNumber?: string;
}

export interface CJSearchOptions {
  /** Country code to filter products with inventory (e.g. US, CN, GB). Default: US */
  countryCode?: string;
  /** Request description and category in response */
  enableDescription?: boolean;
  enableCategory?: boolean;
}

/**
 * Search products in CJ catalog.
 * Uses GET /product/listV2 (Elasticsearch) with keyWord; recommended over legacy /product/list.
 */
export async function searchCJProducts(
  query: string,
  limit = 10,
  options: CJSearchOptions = {}
): Promise<CJProduct[]> {
  const headers = await getCJHeaders();
  const size = Math.min(Math.max(limit, 1), 100);
  const params = new URLSearchParams({
    page: "1",
    size: String(size),
    keyWord: query.trim(),
    countryCode: options.countryCode ?? "US",
  });
  const features: string[] = [];
  if (options.enableCategory !== false) features.push("enable_category");
  if (options.enableDescription) features.push("enable_description");
  features.forEach((f) => params.append("features", f));
  const url = `${CJ_BASE_URL}/product/listV2?${params.toString()}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
    });

    const text = await res.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.error("[CJ] Search non-JSON response:", res.status, text.slice(0, 300));
      return [];
    }

    if (!res.ok) {
      const msg = data?.message || data?.code || String(res.status);
      console.error("[CJ] Search failed:", res.status, msg, text.slice(0, 500));
      if (res.status === 401 || res.status === 403 || data?.code === 1600001) {
        throw new Error("CJ authentication failed. Check CJ_API_KEY or refresh your access token.");
      }
      return [];
    }

    if (data.result === false || (data.code != null && data.code !== 200)) {
      console.error("[CJ] Search API error:", data.code, data.message, "query:", query.trim());
      if (data?.code === 1600001) {
        throw new Error("CJ authentication failed. Check CJ_API_KEY or refresh your access token.");
      }
      return [];
    }

    // Parse product list: CJ listV2 returns data.data.content (array of blocks with productList)
    // Fallback for alternative response shapes (e.g. data.list, data.products)
    let list: any[] = [];
    const content = data.data?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        const productList = block?.productList;
        if (Array.isArray(productList)) list.push(...productList);
      }
    } else {
      const alt = data.data?.list ?? data.data?.products ?? data.list ?? data.products;
      if (Array.isArray(alt)) {
        list = alt;
      } else if (data.data && typeof data.data === "object") {
        console.warn("[CJ] listV2 unexpected shape:", Object.keys(data.data), "query:", query.trim());
      }
    }

    if (list.length === 0) {
      console.warn("[CJ] Search returned 0 products:", { query: query.trim(), status: res.status, dataKeys: Object.keys(data?.data || {}).join(",") });
    }

    if (process.env.NODE_ENV === "development" && list.length > 0) {
      const first = list[0];
      console.debug("[CJ] First product image keys:", {
        bigImage: !!first?.bigImage,
        productImage: !!first?.productImage,
        resolved: firstImageUrlFromProduct(first) || "(empty)",
      });
    }

    const products = list.map((p: any) => {
      const sellPrice = Number(p.sellPrice ?? p.nowPrice ?? p.discountPrice ?? 0) || 0;
      return {
        pid: p.id || p.pid || "",
        name: p.nameEn || p.productNameEn || p.productName || "",
        description: p.description || "",
        image: firstImageUrlFromProduct(p),
        sellPrice,
        sourcePrice: sellPrice,
        category: p.threeCategoryName || p.twoCategoryName || p.oneCategoryName || "",
        variants: [] as CJVariant[],
      };
    });

    // If list response had no images, fetch from product detail (query) for items missing image
    const missingImage = products.filter((pr) => !pr.image && pr.pid);
    if (missingImage.length > 0) {
      const BATCH = 5;
      for (let i = 0; i < missingImage.length; i += BATCH) {
        const batch = missingImage.slice(i, i + BATCH);
        const details = await Promise.all(batch.map((pr) => getCJProduct(pr.pid)));
        batch.forEach((pr, j) => {
          const detail = details[j];
          if (detail?.image) pr.image = detail.image;
        });
      }
    }

    return products;
  } catch (err) {
    if (String((err as Error).message).includes("CJ_API_KEY")) throw err;
    console.error("[CJ] Search error:", err);
    return [];
  }
}

/** Extract first image URL from HTML description (CJ often embeds images in description). */
function extractFirstImageFromHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  const match = html.match(/<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|gif|webp))["']/i);
  return match ? match[1] : "";
}

/** Extract first image URL from product object (handles different CJ API response shapes). */
function firstImageUrlFromProduct(p: any): string {
  if (!p || typeof p !== "object") return "";
  const candidates = [
    p.productImage,
    p.bigImage,
    p.mainImage,
    p.image,
    p.imageUrl,
    p.productImageUrl,
    p.main_image,
    p.product_image,
  ].filter((v) => typeof v === "string" && v.trim().length > 0);
  if (candidates.length > 0) return candidates[0];
  const arr = p.imageList ?? p.images ?? p.productImageList;
  if (Array.isArray(arr) && arr.length > 0) {
    const first = arr[0];
    if (typeof first === "string" && first.trim()) return first;
    if (first?.url && typeof first.url === "string") return first.url;
  }
  const variants = p.variantInventories ?? p.variants;
  if (Array.isArray(variants) && variants.length > 0) {
    const v = variants[0];
    const vImg = v?.variantImage ?? v?.image;
    if (typeof vImg === "string" && vImg.trim()) return vImg;
  }
  for (const key of Object.keys(p)) {
    if (key.toLowerCase().includes("image") && typeof p[key] === "string" && p[key].trim().length > 0) {
      const val = p[key];
      if (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("//")) return val;
    }
  }
  return extractFirstImageFromHtml(p.description || "");
}

/**
 * Get product details from CJ (GET /product/query?pid=...)
 */
export async function getCJProduct(pid: string): Promise<CJProduct | null> {
  try {
    const headers = await getCJHeaders();
    const url = `${CJ_BASE_URL}/product/query?pid=${encodeURIComponent(pid)}`;
    const res = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.data) return null;

    const p = data.data;
    const primaryImage = firstImageUrlFromProduct(p);
    return {
      pid: p.pid,
      name: p.productNameEn || p.productName,
      description: p.description || "",
      image: primaryImage,
      sellPrice: p.sellPrice || 0,
      sourcePrice: p.sourcePrice || 0,
      category: p.categoryName || "",
      variants: (p.variants || []).map((v: any) => ({
        vid: v.vid,
        name: v.variantNameEn || "",
        price: v.variantSellPrice || 0,
        sku: v.variantSku || "",
        image: v.variantImage || "",
      })),
    };
  } catch (err) {
    console.error("[CJ] Get product error:", err);
    return null;
  }
}

export interface CJPlaceOrderParams {
  orderId: string;
  shippingAddress: {
    name: string;
    phone: string;
    country: string;
    province: string;
    city: string;
    address: string;
    zip: string;
  };
  items: { vid: string; quantity: number }[];
  /** CJ logistic name (e.g. CJPacket Ordinary, USPS, PostNL). Required for createOrderV2. */
  logisticName?: string;
  /** Warehouse/ship-from country (e.g. CN, US). Default: CN */
  fromCountryCode?: string;
}

/**
 * Place an order on CJ Dropshipping (createOrderV2).
 * Call freightCalculate first to get valid logisticName for the route, or pass a known value.
 */
export async function placeCJOrder(params: CJPlaceOrderParams): Promise<CJOrderResult | null> {
  try {
    const headers = await getCJHeaders();
    const logisticName = params.logisticName ?? "CJPacket Ordinary";
    const fromCountryCode = params.fromCountryCode ?? "CN";

    const res = await fetch(`${CJ_BASE_URL}/shopping/order/createOrderV2`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        orderNumber: params.orderId,
        shippingCountryCode: params.shippingAddress.country,
        shippingCountry: params.shippingAddress.country,
        shippingProvince: params.shippingAddress.province,
        shippingCity: params.shippingAddress.city,
        shippingAddress: params.shippingAddress.address,
        shippingCustomerName: params.shippingAddress.name,
        shippingPhone: params.shippingAddress.phone,
        shippingZip: params.shippingAddress.zip,
        logisticName,
        fromCountryCode,
        shopLogisticsType: 2,
        products: params.items.map((item, i) => ({
          vid: item.vid,
          quantity: item.quantity,
          storeLineItemId: `line-${params.orderId}-${i}`,
        })),
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("[CJ] Order placement failed:", res.status, errData.message ?? errData.code);
      return null;
    }

    const data = await res.json();
    if (!data.data) return null;

    return {
      orderId: data.data.orderId || params.orderId,
      orderNumber: data.data.orderNumber ?? data.data.orderNum ?? params.orderId,
      status: data.data.orderStatus ?? "placed",
      trackingNumber: data.data.trackNumber ?? data.data.trackingNumber ?? undefined,
    };
  } catch (err) {
    console.error("[CJ] Order error:", err);
    return null;
  }
}

/**
 * Get order detail and tracking info. Uses GET per CJ docs.
 * orderId can be custom order number or CJ order ID.
 */
export async function getCJOrderDetail(orderId: string): Promise<{
  orderId: string;
  orderNum: string;
  orderStatus: string;
  trackNumber?: string;
  trackingUrl?: string;
  productList?: Array<{ vid: string; quantity: number }>;
} | null> {
  try {
    const headers = await getCJHeaders();
    const url = `${CJ_BASE_URL}/shopping/order/getOrderDetail?orderId=${encodeURIComponent(orderId)}`;
    const res = await fetch(url, { method: "GET", headers });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.data) return null;

    const d = data.data;
    const trackNumber = d.trackNumber ?? d.trackingNumber;
    return {
      orderId: d.orderId ?? orderId,
      orderNum: d.orderNum ?? d.orderNumber ?? orderId,
      orderStatus: d.orderStatus ?? "unknown",
      trackNumber: trackNumber ?? undefined,
      trackingUrl: trackNumber ? `https://t.17track.net/en#nums=${trackNumber}` : undefined,
      productList: d.productList,
    };
  } catch (err) {
    console.error("[CJ] Get order detail error:", err);
    return null;
  }
}

/**
 * Get tracking info for a CJ order (from order detail or by tracking number)
 */
export async function getCJTracking(orderNumber: string): Promise<{
  trackingNumber: string;
  trackingUrl: string;
  status: string;
} | null> {
  const detail = await getCJOrderDetail(orderNumber);
  if (!detail?.trackNumber) return null;
  return {
    trackingNumber: detail.trackNumber,
    trackingUrl: detail.trackingUrl ?? `https://t.17track.net/en#nums=${detail.trackNumber}`,
    status: detail.orderStatus || "processing",
  };
}

/**
 * Get tracking info by tracking number (dedicated tracking API)
 */
export async function getCJTrackingByNumber(trackNumber: string): Promise<{
  trackingNumber: string;
  logisticName: string;
  trackingFrom: string;
  trackingTo: string;
  deliveryTime?: string;
  trackingStatus: string;
  lastMileCarrier?: string;
} | null> {
  try {
    const headers = await getCJHeaders();
    const url = `${CJ_BASE_URL}/logistic/trackInfo?trackNumber=${encodeURIComponent(trackNumber)}`;
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) return null;
    const data = await res.json();
    const list = data.data;
    if (!Array.isArray(list) || list.length === 0) return null;
    const t = list[0];
    return {
      trackingNumber: t.trackingNumber,
      logisticName: t.logisticName ?? "",
      trackingFrom: t.trackingFrom ?? "",
      trackingTo: t.trackingTo ?? "",
      deliveryTime: t.deliveryTime,
      trackingStatus: t.trackingStatus ?? "unknown",
      lastMileCarrier: t.lastMileCarrier,
    };
  } catch (err) {
    console.error("[CJ] Tracking by number error:", err);
    return null;
  }
}

/**
 * Freight calculation — get shipping options for a cart.
 * Use the returned logisticName when placing an order.
 */
export async function getCJFreightOptions(params: {
  startCountryCode: string;
  endCountryCode: string;
  products: { vid: string; quantity: number }[];
}): Promise<Array<{ logisticName: string; logisticPrice: number; logisticAging: string }>> {
  try {
    const headers = await getCJHeaders();
    const res = await fetch(`${CJ_BASE_URL}/logistic/freightCalculate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        startCountryCode: params.startCountryCode,
        endCountryCode: params.endCountryCode,
        products: params.products,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data.data;
    if (!Array.isArray(list)) return [];
    return list.map((x: any) => ({
      logisticName: x.logisticName ?? "",
      logisticPrice: Number(x.logisticPrice ?? 0),
      logisticAging: x.logisticAging ?? "",
    }));
  } catch (err) {
    console.error("[CJ] Freight calculation error:", err);
    return [];
  }
}

/**
 * Get product category hierarchy for browse/filter
 */
export async function getCJCategories(): Promise<
  Array<{
    categoryFirstName: string;
    categoryFirstList: Array<{
      categorySecondName: string;
      categorySecondList: Array<{ categoryId: string; categoryName: string }>;
    }>;
  }>
> {
  try {
    const headers = await getCJHeaders();
    const res = await fetch(`${CJ_BASE_URL}/product/getCategory`, { method: "GET", headers });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.data) ? data.data : [];
  } catch (err) {
    console.error("[CJ] Get categories error:", err);
    return [];
  }
}

/**
 * List CJ orders with pagination
 */
export async function getCJOrderList(params?: {
  pageNum?: number;
  pageSize?: number;
  status?: string;
}): Promise<{ list: any[]; total: number }> {
  try {
    const headers = await getCJHeaders();
    const q = new URLSearchParams();
    if (params?.pageNum != null) q.set("pageNum", String(params.pageNum));
    if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
    if (params?.status) q.set("status", params.status);
    const url = `${CJ_BASE_URL}/shopping/order/list?${q.toString()}`;
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) return { list: [], total: 0 };
    const data = await res.json();
    const d = data.data ?? {};
    return {
      list: Array.isArray(d.list) ? d.list : [],
      total: Number(d.total ?? 0),
    };
  } catch (err) {
    console.error("[CJ] Order list error:", err);
    return { list: [], total: 0 };
  }
}

/**
 * Get CJ wallet balance
 */
export async function getCJBalance(): Promise<{ amount: number } | null> {
  try {
    const headers = await getCJHeaders();
    const res = await fetch(`${CJ_BASE_URL}/shopping/pay/getBalance`, { method: "GET", headers });
    if (!res.ok) return null;
    const data = await res.json();
    const d = data.data;
    if (!d) return null;
    return { amount: Number(d.amount ?? 0) };
  } catch (err) {
    console.error("[CJ] Get balance error:", err);
    return null;
  }
}

/**
 * Get warehouse/storage info (supported logistics brands, etc.)
 */
export async function getCJStorageInfo(storageId: string): Promise<{
  id: string;
  name: string;
  areaCountryCode: string;
  address1: string;
  city: string;
  province: string;
  logisticsBrandList: Array<{ id: string; name: string }>;
} | null> {
  try {
    const headers = await getCJHeaders();
    const url = `${CJ_BASE_URL}/warehouse/detail?id=${encodeURIComponent(storageId)}`;
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) return null;
    const data = await res.json();
    const d = data.data;
    if (!d) return null;
    return {
      id: d.id ?? storageId,
      name: d.name ?? "",
      areaCountryCode: d.areaCountryCode ?? "",
      address1: d.address1 ?? "",
      city: d.city ?? "",
      province: d.province ?? "",
      logisticsBrandList: Array.isArray(d.logisticsBrandList) ? d.logisticsBrandList : [],
    };
  } catch (err) {
    console.error("[CJ] Get storage info error:", err);
    return null;
  }
}

/**
 * Get global warehouse list (CN, US, GB, etc.)
 */
export async function getCJGlobalWarehouses(): Promise<
  Array<{ areaId: number; countryCode: string; nameEn: string; areaEn: string }>
> {
  try {
    const headers = await getCJHeaders();
    const res = await fetch(`${CJ_BASE_URL}/product/globalWarehouseList`, { method: "GET", headers });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data.data;
    if (!Array.isArray(list)) return [];
    return list.map((x: any) => ({
      areaId: Number(x.areaId ?? x.id ?? 0),
      countryCode: x.countryCode ?? x.valueEn ?? "",
      nameEn: x.nameEn ?? x.en ?? "",
      areaEn: x.areaEn ?? x.en ?? "",
    }));
  } catch (err) {
    console.error("[CJ] Global warehouses error:", err);
    return [];
  }
}
