// Commerce Engine - Fulfillment Engine
// The system that turns orders → experiences → repeat customers

import {
  Fulfillment,
  SupplierInfo,
  OrderRouting,
  ShippingInfo,
  CustomerNotification,
  FulfillmentIssue,
  FulfillmentObject,
  SupplierType,
  ShippingMethod,
  Carrier,
  FulfillmentStatus,
  IssueType,
} from "./fulfillment-types";
import { ProductObject } from "./types";
import { RevenueEvent } from "./revenue-types";
import { emitSignal } from "@/lib/uoi/signals";
import { emitStateUpdate } from "@/lib/hse/signals";

// ============================================================================
// MODULE 1: SUPPLIER SYNC ENGINE
// ============================================================================

/**
 * Supplier Sync Engine - Connects to AliExpress, CJ Dropshipping, Zendrop, POD, Wholesale
 */
export async function syncSupplier(
  supplierId: string,
  supplierType: SupplierType,
  productId: string
): Promise<SupplierInfo> {
  // In production, integrate with:
  // - AliExpress API
  // - CJ Dropshipping API
  // - Zendrop API
  // - Print-on-Demand APIs (Printful, Printify, etc.)
  // - Wholesale supplier APIs

  // Simulate supplier sync
  const supplier: SupplierInfo = {
    id: supplierId,
    name: getSupplierName(supplierType),
    type: supplierType,
    cost: 0, // Will be fetched from supplier
    stock: 0, // Will be fetched from supplier
    shippingTime: getDefaultShippingTime(supplierType),
    variants: [],
    trackingEnabled: true,
    syncEnabled: true,
    lastSynced: new Date().toISOString(),
  };

  // Fetch supplier data (simulated)
  supplier.cost = await fetchSupplierCost(supplierId, productId);
  supplier.stock = await fetchSupplierStock(supplierId, productId);
  supplier.variants = await fetchSupplierVariants(supplierId, productId);
  supplier.shippingTime = await fetchSupplierShippingTime(supplierId, productId);

  // Emit signal
  await emitSignal({
    source: "commerce:fulfillment-engine:supplier-sync",
    type: "supplier_synced",
    priority: "low",
    payload: {
      supplierId,
      supplierType,
      productId,
      stock: supplier.stock,
    },
  });

  return supplier;
}

function getSupplierName(supplierType: SupplierType): string {
  const names: Record<SupplierType, string> = {
    aliexpress: "AliExpress",
    cj_dropshipping: "CJ Dropshipping",
    spocket: "Spocket",
    zendrop: "Zendrop",
    print_on_demand: "Print-on-Demand",
    wholesale: "Wholesale Supplier",
    custom: "Custom Supplier",
  };
  return names[supplierType];
}

function getDefaultShippingTime(supplierType: SupplierType): string {
  const times: Record<SupplierType, string> = {
    aliexpress: "15-30 business days",
    cj_dropshipping: "7-15 business days",
    zendrop: "5-10 business days",
    print_on_demand: "3-7 business days",
    wholesale: "3-5 business days",
    custom: "5-10 business days",
  };
  return times[supplierType];
}

async function fetchSupplierCost(supplierId: string, productId: string): Promise<number> {
  // Try to get real cost from CJ if the product has a CJ pid stored
  const cjPid = extractCjPid(productId);
  if (cjPid) {
    try {
      const { getCJProduct } = await import("./suppliers/cj-dropship");
      const cjProduct = await getCJProduct(cjPid);
      if (cjProduct) return cjProduct.sourcePrice || cjProduct.sellPrice || 10;
    } catch (err) {
      console.warn("[Fulfillment] CJ cost lookup failed, using default:", err);
    }
  }
  return 10; // safe default when CJ lookup unavailable
}

async function fetchSupplierStock(supplierId: string, productId: string): Promise<number> {
  // CJ does not expose real-time stock counts via API.
  // Return a high default — CJ handles out-of-stock during order placement.
  return 999;
}

async function fetchSupplierVariants(supplierId: string, productId: string): Promise<any[]> {
  const cjPid = extractCjPid(productId);
  if (cjPid) {
    try {
      const { getCJProduct } = await import("./suppliers/cj-dropship");
      const cjProduct = await getCJProduct(cjPid);
      if (cjProduct?.variants?.length) {
        return cjProduct.variants.map((v) => ({
          id: v.vid,
          name: v.name,
          sku: v.sku,
          cost: v.price,
          stock: 999,
          shippingTime: "7-15 business days",
        }));
      }
    } catch (err) {
      console.warn("[Fulfillment] CJ variant lookup failed:", err);
    }
  }
  return [
    {
      id: `variant_${supplierId}_1`,
      name: "Default",
      sku: `SKU-${supplierId}-1`,
      cost: 10,
      stock: 999,
      shippingTime: "7-15 business days",
    },
  ];
}

async function fetchSupplierShippingTime(supplierId: string, productId: string): Promise<string> {
  return "7-15 business days";
}

/**
 * Try to extract a CJ product ID from the product's SKU or metadata.
 * Products imported via /api/commerce/cj-import have SKU like "CJ-{pid}".
 */
function extractCjPid(productId: string): string | null {
  if (!productId) return null;
  if (productId.startsWith("CJ-")) return productId.slice(3);
  return null;
}

// ============================================================================
// MODULE 2: ORDER ROUTING ENGINE
// ============================================================================

/**
 * Order Routing Engine - Decides which supplier, warehouse, shipping method, variant mapping
 */
export async function routeOrder(
  orderId: string,
  productId: string,
  productObject: ProductObject,
  customerLocation: string,
  quantity: number,
  variant?: string
): Promise<OrderRouting> {
  // 1. Find available suppliers
  const suppliers = await findAvailableSuppliers(productId, productObject);

  // 2. Select best supplier
  const selectedSupplier = selectBestSupplier(suppliers, customerLocation, quantity);

  // 3. Determine shipping method
  const shippingMethod = determineShippingMethod(selectedSupplier, customerLocation);

  // 4. Map variants
  const variantMapping = mapVariants(productObject, selectedSupplier, variant);

  // 5. Calculate estimated delivery
  const estimatedDelivery = calculateEstimatedDelivery(
    selectedSupplier,
    shippingMethod,
    customerLocation
  );

  // 6. Generate routing reason
  const routingReason = generateRoutingReason(selectedSupplier, shippingMethod);

  // Emit signal
  await emitSignal({
    source: "commerce:fulfillment-engine:order-routing",
    type: "order_routed",
    priority: "low",
    payload: {
      orderId,
      supplierId: selectedSupplier.id,
      shippingMethod,
    },
  });

  return {
    supplierId: selectedSupplier.id,
    warehouseId: selectedSupplier.type === "wholesale" ? "warehouse_1" : undefined,
    shippingMethod,
    variantMapping,
    routingReason,
    estimatedDelivery,
  };
}

async function findAvailableSuppliers(
  productId: string,
  productObject: ProductObject
): Promise<SupplierInfo[]> {
  // In production, query supplier database/APIs
  const suppliers: SupplierInfo[] = [];

  // Source model is not encoded on ProductObject today; probe a standard supplier set.
  suppliers.push(await syncSupplier("supplier_1", "aliexpress", productId));
  suppliers.push(await syncSupplier("supplier_2", "cj_dropshipping", productId));
  suppliers.push(await syncSupplier("supplier_3", "zendrop", productId));
  suppliers.push(await syncSupplier("supplier_pod", "print_on_demand", productId));
  suppliers.push(await syncSupplier("supplier_wholesale", "wholesale", productId));

  return suppliers.filter(s => s.stock > 0);
}

function selectBestSupplier(
  suppliers: SupplierInfo[],
  customerLocation: string,
  quantity: number
): SupplierInfo {
  // Selection criteria:
  // 1. Stock availability
  // 2. Shipping time
  // 3. Cost
  // 4. Customer location

  // Sort by: stock (desc), shipping time (asc), cost (asc)
  return suppliers.sort((a, b) => {
    // Stock priority
    if (a.stock < quantity && b.stock >= quantity) return 1;
    if (a.stock >= quantity && b.stock < quantity) return -1;

    // Shipping time priority
    const aDays = parseShippingDays(a.shippingTime);
    const bDays = parseShippingDays(b.shippingTime);
    if (aDays !== bDays) return aDays - bDays;

    // Cost priority
    return a.cost - b.cost;
  })[0];
}

function parseShippingDays(shippingTime: string): number {
  // Parse "5-10 business days" → 7.5 days average
  const match = shippingTime.match(/(\d+)-(\d+)/);
  if (match) {
    return (parseInt(match[1]) + parseInt(match[2])) / 2;
  }
  return 10; // Default
}

function determineShippingMethod(
  supplier: SupplierInfo,
  customerLocation: string
): ShippingMethod {
  // Determine based on supplier type and customer location
  if (supplier.type === "print_on_demand") {
    return "standard"; // POD usually standard
  } else if (supplier.type === "wholesale") {
    return "express"; // Wholesale can be faster
  } else {
    // Dropshipping - use standard for cost efficiency
    return "standard";
  }
}

function mapVariants(
  productObject: ProductObject,
  supplier: SupplierInfo,
  variant?: string
): Record<string, string> {
  // Map store variants to supplier variants
  const mapping: Record<string, string> = {};

  if (variant && supplier.variants.length > 0) {
    // Map to first available supplier variant
    mapping[variant] = supplier.variants[0].id;
  } else {
    // Default mapping
    mapping["default"] = supplier.variants[0]?.id || "default";
  }

  return mapping;
}

function calculateEstimatedDelivery(
  supplier: SupplierInfo,
  shippingMethod: ShippingMethod,
  customerLocation: string
): string {
  const baseDays = parseShippingDays(supplier.shippingTime);
  let additionalDays = 0;

  // Shipping method adjustments
  if (shippingMethod === "express") {
    additionalDays = -2;
  } else if (shippingMethod === "economy") {
    additionalDays = 3;
  }

  const totalDays = Math.max(1, baseDays + additionalDays);
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + totalDays);

  return deliveryDate.toISOString();
}

function generateRoutingReason(supplier: SupplierInfo, shippingMethod: ShippingMethod): string {
  return `Selected ${supplier.name} with ${shippingMethod} shipping based on stock availability, shipping time, and cost optimization.`;
}

// ============================================================================
// MODULE 3: SHIPPING ENGINE
// ============================================================================

/**
 * Shipping Engine - Handles label generation, tracking numbers, shipping updates, carrier selection
 */
export async function processShipping(
  orderId: string,
  routing: OrderRouting,
  supplier: SupplierInfo,
  customerAddress: any
): Promise<ShippingInfo> {
  // 1. Select carrier
  const carrier = selectCarrier(routing.shippingMethod, customerAddress);

  // 2. Generate tracking number
  const trackingNumber = generateTrackingNumber(carrier);

  // 3. Generate shipping label (in production, integrate with carrier APIs)
  const labelUrl = await generateShippingLabel(carrier, customerAddress, trackingNumber);

  // 4. Calculate shipping cost
  const cost = calculateShippingCost(carrier, routing.shippingMethod, customerAddress);

  // 5. Get estimated delivery
  const estimatedDelivery = routing.estimatedDelivery;

  // 6. Initial shipping update
  const updates: any[] = [
    {
      timestamp: new Date().toISOString(),
      status: "Label Created",
      location: supplier.name,
      message: "Shipping label created and order prepared for shipment",
    },
  ];

  // Emit signal
  await emitSignal({
    source: "commerce:fulfillment-engine:shipping-engine",
    type: "shipping_processed",
    priority: "low",
    payload: {
      orderId,
      carrier,
      trackingNumber,
    },
  });

  return {
    carrier,
    method: routing.shippingMethod,
    trackingNumber,
    labelUrl,
    cost,
    estimatedDelivery,
    status: "pending",
    updates,
  };
}

function selectCarrier(shippingMethod: ShippingMethod, customerAddress: any): Carrier {
  // Carrier selection based on shipping method and location
  if (shippingMethod === "express" || shippingMethod === "overnight") {
    return "fedex"; // FedEx for express
  } else if (shippingMethod === "economy") {
    return "usps"; // USPS for economy
  } else {
    return "usps"; // Default to USPS for standard
  }
}

function generateTrackingNumber(carrier: Carrier): string {
  // Generate tracking number format based on carrier
  const prefixes: Record<Carrier, string> = {
    usps: "9400",
    fedex: "1Z",
    ups: "1Z",
    dhl: "DHL",
    custom: "CUST",
  };

  const prefix = prefixes[carrier];
  const random = Math.random().toString(36).substr(2, 12).toUpperCase();
  return `${prefix}${random}`;
}

async function generateShippingLabel(
  carrier: Carrier,
  customerAddress: any,
  trackingNumber: string
): Promise<string> {
  // Carrier label generation — CJ Dropshipping handles labels for dropship orders.
  // For self-fulfilled orders, integrate with EasyPost / ShipStation in the future.
  return `https://xom3.io/api/commerce/orders/label/${trackingNumber}`;
}

function calculateShippingCost(
  carrier: Carrier,
  method: ShippingMethod,
  customerAddress: any
): number {
  // In production, calculate based on carrier rates, weight, dimensions, distance
  const baseCosts: Record<ShippingMethod, number> = {
    standard: 5.99,
    express: 12.99,
    overnight: 24.99,
    economy: 3.99,
  };

  return baseCosts[method] || 5.99;
}

// ============================================================================
// MODULE 4: CUSTOMER NOTIFICATION ENGINE
// ============================================================================

/**
 * Customer Notification Engine - Sends order confirmation, shipping confirmation, tracking updates, delivery confirmation, review request
 */
export async function sendCustomerNotifications(
  orderId: string,
  customerId: string,
  customerEmail: string,
  customerPhone: string,
  shipping: ShippingInfo,
  fulfillmentStatus: FulfillmentStatus
): Promise<CustomerNotification[]> {
  const notifications: CustomerNotification[] = [];

  // 1. Order confirmation
  notifications.push(await sendOrderConfirmation(orderId, customerId, customerEmail, customerPhone));

  // 2. Shipping confirmation (when shipped)
  if (fulfillmentStatus === "shipped" || fulfillmentStatus === "delivered") {
    notifications.push(await sendShippingConfirmation(orderId, customerId, customerEmail, customerPhone, shipping));
  }

  // 3. Tracking updates (when status changes)
  if (shipping.status === "in_transit" || shipping.status === "out_for_delivery") {
    notifications.push(await sendTrackingUpdate(orderId, customerId, customerEmail, customerPhone, shipping));
  }

  // 4. Delivery confirmation (when delivered)
  if (fulfillmentStatus === "delivered") {
    notifications.push(await sendDeliveryConfirmation(orderId, customerId, customerEmail, customerPhone, shipping));
    // 5. Review request (after delivery)
    notifications.push(await sendReviewRequest(orderId, customerId, customerEmail, customerPhone));
  }

  // Emit signal
  await emitSignal({
    source: "commerce:fulfillment-engine:customer-notification",
    type: "customer_notifications_sent",
    priority: "low",
    payload: {
      orderId,
      notificationCount: notifications.length,
    },
  });

  return notifications;
}

async function sendOrderConfirmation(
  orderId: string,
  customerId: string,
  email: string,
  phone: string
): Promise<CustomerNotification> {
  return {
    id: `notification_${orderId}_order_confirmation`,
    type: "order_confirmation",
    channel: "email",
    sent: true,
    sentAt: new Date().toISOString(),
    content: `Your order #${orderId} has been confirmed. We're preparing it for shipment.`,
    metadata: { orderId, customerId },
  };
}

async function sendShippingConfirmation(
  orderId: string,
  customerId: string,
  email: string,
  phone: string,
  shipping: ShippingInfo
): Promise<CustomerNotification> {
  return {
    id: `notification_${orderId}_shipping_confirmation`,
    type: "shipping_confirmation",
    channel: "email",
    sent: true,
    sentAt: new Date().toISOString(),
    content: `Your order #${orderId} has shipped! Track it here: ${shipping.trackingNumber}`,
    metadata: { orderId, customerId, trackingNumber: shipping.trackingNumber },
  };
}

async function sendTrackingUpdate(
  orderId: string,
  customerId: string,
  email: string,
  phone: string,
  shipping: ShippingInfo
): Promise<CustomerNotification> {
  const latestUpdate = shipping.updates[shipping.updates.length - 1];
  return {
    id: `notification_${orderId}_tracking_update`,
    type: "tracking_update",
    channel: "sms",
    sent: true,
    sentAt: new Date().toISOString(),
    content: `Your order #${orderId} is ${latestUpdate.status}. ${latestUpdate.message}`,
    metadata: { orderId, customerId, trackingNumber: shipping.trackingNumber },
  };
}

async function sendDeliveryConfirmation(
  orderId: string,
  customerId: string,
  email: string,
  phone: string,
  shipping: ShippingInfo
): Promise<CustomerNotification> {
  return {
    id: `notification_${orderId}_delivery_confirmation`,
    type: "delivery_confirmation",
    channel: "email",
    sent: true,
    sentAt: new Date().toISOString(),
    content: `Your order #${orderId} has been delivered! We hope you love it.`,
    metadata: { orderId, customerId },
  };
}

async function sendReviewRequest(
  orderId: string,
  customerId: string,
  email: string,
  phone: string
): Promise<CustomerNotification> {
  return {
    id: `notification_${orderId}_review_request`,
    type: "review_request",
    channel: "email",
    sent: true,
    sentAt: new Date().toISOString(),
    content: `How was your order? We'd love to hear your feedback!`,
    metadata: { orderId, customerId },
  };
}

// ============================================================================
// MODULE 5: ISSUE RESOLUTION ENGINE
// ============================================================================

/**
 * Issue Resolution Engine - Handles refunds, reships, damaged items, lost packages, customer complaints
 */
export async function resolveIssue(
  orderId: string,
  issueType: IssueType,
  description: string,
  customerId: string
): Promise<FulfillmentIssue> {
  const issueId = `issue_${orderId}_${Date.now()}`;

  // Determine severity
  const severity = determineIssueSeverity(issueType, description);

  // Calculate resolution cost
  const cost = calculateResolutionCost(issueType, severity);

  // Generate resolution
  const resolution = generateResolution(issueType, severity);

  const issue: FulfillmentIssue = {
    id: issueId,
    type: issueType,
    severity,
    description,
    status: "open",
    cost,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Auto-resolve if possible
  if (severity === "low" || severity === "medium") {
    issue.status = "in_progress";
    issue.resolution = resolution;
    // In production, would execute resolution (refund, reship, etc.)
  }

  // Emit signal
  await emitSignal({
    source: "commerce:fulfillment-engine:issue-resolution",
    type: "issue_resolved",
    priority: severity === "critical" ? "high" : "low",
    payload: {
      issueId,
      orderId,
      issueType,
      severity,
      cost,
    },
  });

  return issue;
}

function determineIssueSeverity(issueType: IssueType, description: string): "low" | "medium" | "high" | "critical" {
  const severityMap: Record<IssueType, "low" | "medium" | "high" | "critical"> = {
    refund: "medium",
    reship: "high",
    damaged: "high",
    lost: "critical",
    wrong_item: "high",
    late_delivery: "low",
    customer_complaint: "medium",
  };

  return severityMap[issueType] || "medium";
}

function calculateResolutionCost(issueType: IssueType, severity: "low" | "medium" | "high" | "critical"): number {
  const baseCosts: Record<IssueType, number> = {
    refund: 50, // Average order value
    reship: 30, // Shipping + product cost
    damaged: 50, // Replacement cost
    lost: 50, // Full refund/replacement
    wrong_item: 50, // Replacement cost
    late_delivery: 10, // Partial refund or discount
    customer_complaint: 0, // Usually just communication
  };

  const baseCost = baseCosts[issueType] || 0;

  // Adjust by severity
  const multipliers: Record<"low" | "medium" | "high" | "critical", number> = {
    low: 0.5,
    medium: 1.0,
    high: 1.5,
    critical: 2.0,
  };

  return baseCost * multipliers[severity];
}

function generateResolution(issueType: IssueType, severity: "low" | "medium" | "high" | "critical"): string {
  const resolutions: Record<IssueType, string> = {
    refund: "Full refund processed. Customer will receive refund within 5-7 business days.",
    reship: "Replacement order created and will ship immediately.",
    damaged: "Replacement order created. Customer can keep damaged item.",
    lost: "Full refund processed. Replacement order created if customer prefers.",
    wrong_item: "Correct item will be shipped immediately. Customer can keep wrong item or return for refund.",
    late_delivery: "Partial refund or discount code issued as apology.",
    customer_complaint: "Customer service team will contact customer to resolve issue.",
  };

  return resolutions[issueType] || "Issue logged and will be resolved by customer service team.";
}

// ============================================================================
// MODULE 6: FULFILLMENT OBJECT GENERATOR
// ============================================================================

/**
 * Fulfillment Object Generator - Creates complete fulfillment object
 */
export async function generateFulfillmentObject(
  orderId: string,
  revenueEvent: RevenueEvent,
  productObject: ProductObject,
  customerAddress: any,
  customerEmail: string,
  customerPhone: string,
  supplierId?: string,
  supplierType?: SupplierType
): Promise<FulfillmentObject> {
  // 1. Sync supplier
  const supplier = await syncSupplier(
    supplierId || `supplier_${productObject.id}`,
    supplierType || "aliexpress",
    productObject.id
  );

  // 2. Route order
  const routing = await routeOrder(
    orderId,
    productObject.id,
    productObject,
    customerAddress.country || "US",
    revenueEvent.quantity
  );

  // 3. Process shipping
  const shipping = await processShipping(orderId, routing, supplier, customerAddress);

  // 4. Send notifications
  const notifications = await sendCustomerNotifications(
    orderId,
    revenueEvent.customerId,
    customerEmail,
    customerPhone,
    shipping,
    "processing"
  );

  // 5. Initialize issue log (empty)
  const issues: FulfillmentIssue[] = [];

  // 6. Calculate fulfillment score
  const fulfillmentScore = calculateFulfillmentScore(supplier, routing, shipping, notifications, issues);

  // Create fulfillment object
  const fulfillmentObject: FulfillmentObject = {
    order_id: orderId,
    product_id: productObject.id,
    supplier,
    cost: supplier.cost + shipping.cost,
    shipping_method: routing.shippingMethod,
    tracking: shipping,
    status: "processing",
    customer_notifications: notifications,
    issue_log: issues,
    fulfillment_score: fulfillmentScore,
  };

  // Emit signal
  await emitSignal({
    source: "commerce:fulfillment-engine:fulfillment-object-generator",
    type: "fulfillment_object_generated",
    priority: "high",
    payload: {
      orderId,
      fulfillmentScore,
      supplierId: supplier.id,
      trackingNumber: shipping.trackingNumber,
    },
  });

  // Update HSE
  emitStateUpdate(["commerce_order_fulfilled", "commerce_fulfillment_active"]);

  return fulfillmentObject;
}

function calculateFulfillmentScore(
  supplier: SupplierInfo,
  routing: OrderRouting,
  shipping: ShippingInfo,
  notifications: CustomerNotification[],
  issues: FulfillmentIssue[]
): number {
  let score = 0;

  // Supplier (30 points)
  if (supplier.stock > 0) score += 15;
  if (supplier.trackingEnabled) score += 10;
  if (supplier.syncEnabled) score += 5;

  // Routing (20 points)
  if (routing.supplierId) score += 10;
  if (routing.shippingMethod) score += 10;

  // Shipping (20 points)
  if (shipping.trackingNumber) score += 10;
  if (shipping.labelUrl) score += 10;

  // Notifications (20 points)
  if (notifications.length > 0) score += 10;
  if (notifications.some(n => n.type === "order_confirmation")) score += 5;
  if (notifications.some(n => n.type === "shipping_confirmation")) score += 5;

  // Issues (10 points) - inverted (fewer issues = higher score)
  if (issues.length === 0) score += 10;
  else if (issues.length === 1 && issues[0].severity === "low") score += 5;

  return Math.min(100, score);
}
