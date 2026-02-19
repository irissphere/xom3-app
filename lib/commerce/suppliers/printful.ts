/**
 * Printful Print-on-Demand Integration Service
 * 
 * Handles product catalog, mockup generation, and order placement via Printful API.
 * API docs: https://developers.printful.com/docs/
 * 
 * Required env vars:
 *   PRINTFUL_API_KEY - Printful API token (from dashboard)
 */

const PRINTFUL_BASE_URL = "https://api.printful.com";

function getPrintfulHeaders(): Record<string, string> {
  const key = process.env.PRINTFUL_API_KEY;
  if (!key) throw new Error("PRINTFUL_API_KEY not configured");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
}

export interface PrintfulProduct {
  id: number;
  title: string;
  description: string;
  image: string;
  variants: PrintfulVariant[];
  type: string;
}

export interface PrintfulVariant {
  id: number;
  name: string;
  size: string;
  color: string;
  price: number;
  retailPrice: number;
}

export interface PrintfulOrderResult {
  id: number;
  externalId: string;
  status: string;
  shipping: string;
  created: string;
  items: { name: string; quantity: number }[];
}

/**
 * Get available Printful product catalog
 */
export async function getPrintfulCatalog(category?: string): Promise<PrintfulProduct[]> {
  try {
    const res = await fetch(`${PRINTFUL_BASE_URL}/products`, {
      headers: getPrintfulHeaders(),
    });

    if (!res.ok) {
      console.error("[Printful] Catalog fetch failed:", res.status);
      return [];
    }

    const data = await res.json();
    if (!data.result) return [];

    return data.result
      .filter((p: any) => !category || p.type_name?.toLowerCase().includes(category.toLowerCase()))
      .slice(0, 20)
      .map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description || "",
        image: p.image || "",
        type: p.type_name || "",
        variants: [],
      }));
  } catch (err) {
    console.error("[Printful] Catalog error:", err);
    return [];
  }
}

/**
 * Get product variants with pricing
 */
export async function getPrintfulProductVariants(productId: number): Promise<PrintfulVariant[]> {
  try {
    const res = await fetch(`${PRINTFUL_BASE_URL}/products/${productId}`, {
      headers: getPrintfulHeaders(),
    });

    if (!res.ok) return [];
    const data = await res.json();

    return (data.result?.variants || []).map((v: any) => ({
      id: v.id,
      name: v.name,
      size: v.size || "",
      color: v.color || "",
      price: v.price ? parseFloat(v.price) : 0,
      retailPrice: v.retail_price ? parseFloat(v.retail_price) : 0,
    }));
  } catch (err) {
    console.error("[Printful] Variants error:", err);
    return [];
  }
}

/**
 * Place a POD order on Printful
 */
export async function placePrintfulOrder(params: {
  externalId: string;
  recipient: {
    name: string;
    address1: string;
    address2?: string;
    city: string;
    stateCode: string;
    countryCode: string;
    zip: string;
    phone?: string;
    email?: string;
  };
  items: {
    variantId: number;
    quantity: number;
    designUrl: string;
    name?: string;
    retailPrice?: number;
  }[];
}): Promise<PrintfulOrderResult | null> {
  try {
    const res = await fetch(`${PRINTFUL_BASE_URL}/orders`, {
      method: "POST",
      headers: getPrintfulHeaders(),
      body: JSON.stringify({
        external_id: params.externalId,
        recipient: {
          name: params.recipient.name,
          address1: params.recipient.address1,
          address2: params.recipient.address2 || "",
          city: params.recipient.city,
          state_code: params.recipient.stateCode,
          country_code: params.recipient.countryCode,
          zip: params.recipient.zip,
          phone: params.recipient.phone || "",
          email: params.recipient.email || "",
        },
        items: params.items.map((item) => ({
          variant_id: item.variantId,
          quantity: item.quantity,
          name: item.name || "",
          retail_price: item.retailPrice ? String(item.retailPrice) : undefined,
          files: [
            {
              type: "default",
              url: item.designUrl,
            },
          ],
        })),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Printful] Order failed:", res.status, errText);
      return null;
    }

    const data = await res.json();
    if (!data.result) return null;

    return {
      id: data.result.id,
      externalId: data.result.external_id,
      status: data.result.status,
      shipping: data.result.shipping || "standard",
      created: data.result.created,
      items: (data.result.items || []).map((i: any) => ({
        name: i.name,
        quantity: i.quantity,
      })),
    };
  } catch (err) {
    console.error("[Printful] Order error:", err);
    return null;
  }
}

/**
 * Get order status from Printful
 */
export async function getPrintfulOrderStatus(orderId: number): Promise<{
  status: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
} | null> {
  try {
    const res = await fetch(`${PRINTFUL_BASE_URL}/orders/${orderId}`, {
      headers: getPrintfulHeaders(),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const order = data.result;

    if (!order) return null;

    const shipment = order.shipments?.[0];
    return {
      status: order.status,
      trackingNumber: shipment?.tracking_number || undefined,
      trackingUrl: shipment?.tracking_url || undefined,
      carrier: shipment?.carrier || undefined,
    };
  } catch (err) {
    console.error("[Printful] Status error:", err);
    return null;
  }
}

/**
 * Generate a mockup image for a product design
 */
export async function generatePrintfulMockup(
  productId: number,
  variantIds: number[],
  designUrl: string
): Promise<string | null> {
  try {
    // Create mockup generation task
    const res = await fetch(`${PRINTFUL_BASE_URL}/mockup-generator/create-task/${productId}`, {
      method: "POST",
      headers: getPrintfulHeaders(),
      body: JSON.stringify({
        variant_ids: variantIds,
        files: [{ placement: "front", image_url: designUrl }],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const taskKey = data.result?.task_key;

    if (!taskKey) return null;

    // Poll for result (simplified - in production use webhooks)
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const statusRes = await fetch(
        `${PRINTFUL_BASE_URL}/mockup-generator/task?task_key=${taskKey}`,
        { headers: getPrintfulHeaders() }
      );

      if (!statusRes.ok) continue;
      const statusData = await statusRes.json();

      if (statusData.result?.status === "completed") {
        return statusData.result?.mockups?.[0]?.mockup_url || null;
      }
    }

    return null;
  } catch (err) {
    console.error("[Printful] Mockup error:", err);
    return null;
  }
}
