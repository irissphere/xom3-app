// Commerce Engine - Fulfillment Engine Type Definitions
// The system that turns orders → experiences → repeat customers

import { ProductObject } from "./types";
import { RevenueEvent } from "./revenue-types";

export type SupplierType = "aliexpress" | "cj_dropshipping" | "spocket" | "zendrop" | "print_on_demand" | "wholesale" | "custom";
export type ShippingMethod = "standard" | "express" | "overnight" | "economy";
export type Carrier = "usps" | "fedex" | "ups" | "dhl" | "custom";
export type FulfillmentStatus = "pending" | "processing" | "shipped" | "delivered" | "returned" | "refunded" | "cancelled";
export type IssueType = "refund" | "reship" | "damaged" | "lost" | "wrong_item" | "late_delivery" | "customer_complaint";

export interface Fulfillment {
  id: string;
  orderId: string;
  productId: string;
  customerId: string;
  status: FulfillmentStatus;
  supplier: SupplierInfo;
  routing: OrderRouting;
  shipping: ShippingInfo;
  notifications: CustomerNotification[];
  issues: FulfillmentIssue[];
  fulfillmentScore: number; // 0-100
  createdAt: string;
  updatedAt: string;
}

export interface SupplierInfo {
  id: string;
  name: string;
  type: SupplierType;
  cost: number;
  stock: number;
  shippingTime: string; // e.g., "3-5 business days"
  variants: SupplierVariant[];
  trackingEnabled: boolean;
  syncEnabled: boolean;
  lastSynced?: string;
}

export interface SupplierVariant {
  id: string;
  name: string;
  sku: string;
  cost: number;
  stock: number;
  shippingTime: string;
}

export interface OrderRouting {
  supplierId: string;
  warehouseId?: string;
  shippingMethod: ShippingMethod;
  variantMapping: Record<string, string>; // Store variant → Supplier variant
  routingReason: string;
  estimatedDelivery: string;
}

export interface ShippingInfo {
  carrier: Carrier;
  method: ShippingMethod;
  trackingNumber: string;
  labelUrl?: string;
  cost: number;
  estimatedDelivery: string;
  actualDelivery?: string;
  status: "pending" | "in_transit" | "out_for_delivery" | "delivered" | "exception";
  updates: ShippingUpdate[];
}

export interface ShippingUpdate {
  timestamp: string;
  status: string;
  location?: string;
  message: string;
}

export interface CustomerNotification {
  id: string;
  type: "order_confirmation" | "shipping_confirmation" | "tracking_update" | "delivery_confirmation" | "review_request";
  channel: "email" | "sms" | "push";
  sent: boolean;
  sentAt?: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface FulfillmentIssue {
  id: string;
  type: IssueType;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  status: "open" | "in_progress" | "resolved" | "escalated";
  resolution?: string;
  resolvedAt?: string;
  cost: number; // Cost of resolution (refund, reship, etc.)
  createdAt: string;
  updatedAt: string;
}

export interface FulfillmentObject {
  order_id: string;
  product_id: string;
  supplier: SupplierInfo;
  cost: number;
  shipping_method: ShippingMethod;
  tracking: ShippingInfo;
  status: FulfillmentStatus;
  customer_notifications: CustomerNotification[];
  issue_log: FulfillmentIssue[];
  fulfillment_score: number;
}
