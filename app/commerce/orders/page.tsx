"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FeatureGate } from "@/app/components/FeatureGate";
import { CommercePageActions } from "../components/CommercePageActions";

interface ShippingAddress {
  line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

interface Order {
  id: string;
  user_id?: string;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at?: string;
  email?: string;
  shipping_address?: ShippingAddress | null;
  items?: OrderItem[];
}

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  product_name?: string;
}

type OrderStatus = "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

const ALL_STATUSES: OrderStatus[] = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];

const STATUS_TRANSITIONS: Record<string, { label: string; next: OrderStatus }> = {
  pending: { label: "Mark as Paid", next: "paid" },
  paid: { label: "Start Processing", next: "processing" },
  processing: { label: "Mark as Shipped", next: "shipped" },
  shipped: { label: "Mark as Delivered", next: "delivered" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [processingRefund, setProcessingRefund] = useState(false);

  // Fulfillment engine state
  const [fulfillLoading, setFulfillLoading] = useState(false);
  const [fulfillResult, setFulfillResult] = useState<any>(null);
  const [fulfillError, setFulfillError] = useState<string | null>(null);

  const runFulfillment = async (order: Order) => {
    setFulfillLoading(true);
    setFulfillError(null);
    setFulfillResult(null);
    try {
      const res = await fetch("/api/commerce/fulfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", orderId: order.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setFulfillResult(data.fulfillment);
      } else {
        setFulfillError(data.error || "Fulfillment failed");
      }
    } catch (err: any) {
      setFulfillError(err.message || "Fulfillment failed");
    } finally {
      setFulfillLoading(false);
    }
  };

  const sendNotification = async (order: Order) => {
    try {
      const res = await fetch("/api/commerce/fulfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "notify",
          orderId: order.id,
          customerId: order.user_id || order.email || "",
          customerEmail: order.email || "",
          shipping: fulfillResult?.shipping || {},
          fulfillmentStatus: order.status,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        alert("Customer notification sent!");
      } else {
        alert(data.error || "Failed to send notification");
      }
    } catch {
      alert("Failed to send notification");
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/commerce/orders");
      const data = await res.json();
      if (data.ok) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch("/api/commerce/orders/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      const data = await res.json();
      if (data.ok) {
        // Update the order in local state
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: newStatus, updated_at: new Date().toISOString() } : o
          )
        );
        // Update selected order if it's the one being changed
        setSelectedOrder((prev) =>
          prev && prev.id === orderId
            ? { ...prev, status: newStatus, updated_at: new Date().toISOString() }
            : prev
        );
      } else {
        console.error("Failed to update status:", data.error);
        alert(`Failed to update status: ${data.error}`);
      }
    } catch (err) {
      console.error("Failed to update order status:", err);
      alert("Failed to update order status. Please try again.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const processRefund = async (orderId: string) => {
    setProcessingRefund(true);
    try {
      const res = await fetch("/api/commerce/orders/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reason: "requested_by_customer" }),
      });
      const data = await res.json();
      if (data.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: "refunded", updated_at: new Date().toISOString() } : o
          )
        );
        setSelectedOrder((prev) =>
          prev && prev.id === orderId
            ? { ...prev, status: "refunded", updated_at: new Date().toISOString() }
            : prev
        );
        alert(`Refund processed successfully. Refund ID: ${data.refund?.id}`);
      } else {
        alert(`Refund failed: ${data.error}`);
      }
    } catch (err) {
      console.error("Refund failed:", err);
      alert("Refund failed. Please try again.");
    } finally {
      setProcessingRefund(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "#fbbf24",
      paid: "#34d399",
      processing: "#60a5fa",
      shipped: "#a78bfa",
      delivered: "#4ade80",
      cancelled: "#f87171",
      refunded: "#fb923c",
    };
    return colors[status.toLowerCase()] || "var(--text-2)";
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate stats
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const pendingOrders = orders.filter((o) => o.status?.toLowerCase() === "pending").length;
  const completedOrders = orders.filter((o) => o.status?.toLowerCase() === "delivered").length;

  // Filter orders by status
  const filteredOrders =
    statusFilter === "all"
      ? orders
      : orders.filter((o) => o.status?.toLowerCase() === statusFilter);

  // Truncate UUID for display
  const truncateId = (id: string) => (id && id.length > 8 ? id.slice(0, 8) : id);

  return (
    <FeatureGate feature="ecommerce">
      <main className="xom3-home">
        <div
          className="xom3-container"
          style={{ paddingTop: 22, paddingBottom: 24 }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                className="xom3-mono"
                style={{
                  color: "var(--text-2)",
                  fontSize: 12,
                  letterSpacing: "0.08em",
                }}
              >
                COMMERCE / ORDERS
              </div>
              <h1
                style={{
                  margin: "10px 0 6px 0",
                  fontSize: 28,
                  fontWeight: 860,
                  letterSpacing: "-0.02em",
                }}
              >
                Order Management
              </h1>
              <p className="xom3-subtle" style={{ margin: 0, maxWidth: 720 }}>
                Track and manage customer orders. View order details and update statuses.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <CommercePageActions />
              <button
                className="xom3-btn xom3-btnPrimary"
                onClick={fetchOrders}
              >
                ↻ Refresh
              </button>
            </div>
          </header>

          {/* Status Filter */}
          <section className="xom3-section" style={{ marginTop: 18 }}>
            <div
              className="xom3-glass xom3-glassEdge"
              style={{
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span
                className="xom3-mono"
                style={{ fontSize: 11, color: "var(--text-2)", letterSpacing: "0.08em" }}
              >
                FILTER BY STATUS
              </span>
              <select
                title="Filter orders by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 6,
                  color: "inherit",
                  padding: "6px 12px",
                  fontSize: 13,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="all">All Statuses</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              {statusFilter !== "all" && (
                <span className="xom3-subtle" style={{ fontSize: 13 }}>
                  Showing {filteredOrders.length} of {orders.length} orders
                </span>
              )}
            </div>
          </section>

          {/* Quick Stats */}
          <section className="xom3-section" style={{ marginTop: 18 }}>
            <div className="xom3-grid xom3-grid3">
              <StatCard
                label="Total Orders"
                value={String(orders.length)}
                accent="info"
              />
              <StatCard
                label="Pending"
                value={String(pendingOrders)}
                accent="warning"
              />
              <StatCard
                label="Revenue"
                value={`$${totalRevenue.toFixed(2)}`}
                accent="success"
              />
            </div>
          </section>

          {/* Order List */}
          <section className="xom3-section" style={{ marginTop: 18 }}>
            {loading ? (
              <div
                className="xom3-glass xom3-glassEdge"
                style={{ padding: 40, textAlign: "center" }}
              >
                <div className="xom3-subtle">Loading orders...</div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div
                className="xom3-glass xom3-glassEdge"
                style={{ padding: 40, textAlign: "center" }}
              >
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>
                  🛒
                </div>
                <div className="xom3-panel-title">
                  {statusFilter !== "all" ? "No matching orders" : "No orders yet"}
                </div>
                <p className="xom3-subtle" style={{ margin: "8px 0 0 0" }}>
                  {statusFilter !== "all"
                    ? `No orders with status "${statusFilter}". Try a different filter.`
                    : "Orders will appear here when customers make purchases."}
                </p>
              </div>
            ) : (
              <div
                className="xom3-glass xom3-glassEdge"
                style={{ overflow: "hidden" }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 14,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <th style={thStyle}>Order ID</th>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Status</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Total</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          cursor: "pointer",
                        }}
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td style={tdStyle}>
                          <span
                            className="xom3-mono"
                            style={{ fontWeight: 600 }}
                            title={order.id}
                          >
                            #{truncateId(order.id)}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span className="xom3-subtle">
                            {formatDate(order.created_at)}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              background: `${getStatusColor(order.status)}20`,
                              color: getStatusColor(order.status),
                              padding: "4px 10px",
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              textTransform: "uppercase",
                            }}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <span className="xom3-mono" style={{ fontWeight: 700 }}>
                            ${order.total_amount?.toFixed(2) || "0.00"}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          {(order.status === "paid" || order.status === "processing") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                                setFulfillResult(null);
                                setFulfillError(null);
                                runFulfillment(order);
                              }}
                              style={{
                                ...actionBtnStyle,
                                background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(22,163,74,0.15))",
                                border: "1px solid rgba(34,197,94,0.25)",
                                borderRadius: 6,
                                padding: "4px 8px",
                                opacity: 1,
                              }}
                              title="Fulfill Order (AI Engine)"
                            >
                              📦
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                              setFulfillResult(null);
                              setFulfillError(null);
                            }}
                            style={{ ...actionBtnStyle, marginLeft: 6 }}
                            title="View Details"
                          >
                            👁️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Order Detail Modal */}
          {selectedOrder && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                padding: 20,
              }}
              onClick={() => setSelectedOrder(null)}
            >
              <div
                className="xom3-glass xom3-glassEdge"
                style={{
                  maxWidth: 500,
                  width: "100%",
                  padding: 24,
                  maxHeight: "80vh",
                  overflow: "auto",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <div className="xom3-panel-title" title={selectedOrder.id}>
                    Order #{truncateId(selectedOrder.id)}
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 20,
                      opacity: 0.5,
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <span className="xom3-subtle" style={{ fontSize: 12 }}>
                      STATUS
                    </span>
                    <div
                      style={{
                        marginTop: 4,
                        color: getStatusColor(selectedOrder.status),
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      {selectedOrder.status}
                    </div>
                  </div>

                  <div>
                    <span className="xom3-subtle" style={{ fontSize: 12 }}>
                      DATE
                    </span>
                    <div style={{ marginTop: 4 }}>
                      {formatDate(selectedOrder.created_at)}
                    </div>
                  </div>

                  <div>
                    <span className="xom3-subtle" style={{ fontSize: 12 }}>
                      TOTAL AMOUNT
                    </span>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 24,
                        fontWeight: 800,
                        color: "#4ade80",
                      }}
                    >
                      ${selectedOrder.total_amount?.toFixed(2) || "0.00"}
                    </div>
                  </div>

                  {selectedOrder.email && (
                    <div>
                      <span className="xom3-subtle" style={{ fontSize: 12 }}>
                        CUSTOMER EMAIL
                      </span>
                      <div style={{ marginTop: 4 }}>{selectedOrder.email}</div>
                    </div>
                  )}

                  {selectedOrder.shipping_address && (
                    <div>
                      <span className="xom3-subtle" style={{ fontSize: 12 }}>
                        SHIPPING ADDRESS
                      </span>
                      <div
                        style={{
                          marginTop: 6,
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 13,
                          lineHeight: 1.6,
                        }}
                      >
                        {selectedOrder.shipping_address.line1 && (
                          <div>{selectedOrder.shipping_address.line1}</div>
                        )}
                        <div>
                          {[
                            selectedOrder.shipping_address.city,
                            selectedOrder.shipping_address.state,
                            selectedOrder.shipping_address.postal_code,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                        {selectedOrder.shipping_address.country && (
                          <div>{selectedOrder.shipping_address.country}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div>
                      <span className="xom3-subtle" style={{ fontSize: 12 }}>
                        ITEMS
                      </span>
                      <div
                        style={{
                          marginTop: 8,
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        {selectedOrder.items.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "8px 0",
                              borderBottom:
                                idx < selectedOrder.items!.length - 1
                                  ? "1px solid rgba(255,255,255,0.05)"
                                  : "none",
                            }}
                          >
                            <span>
                              {item.product_name || `Product #${item.product_id}`} x{item.quantity}
                            </span>
                            <span className="xom3-mono">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Workflow Actions */}
                {selectedOrder.status?.toLowerCase() !== "cancelled" &&
                  selectedOrder.status?.toLowerCase() !== "refunded" && (
                    <div
                      style={{
                        marginTop: 20,
                        padding: "16px 0 0 0",
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <span
                        className="xom3-mono"
                        style={{
                          fontSize: 11,
                          color: "var(--text-2)",
                          letterSpacing: "0.08em",
                        }}
                      >
                        ORDER ACTIONS
                      </span>
                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {STATUS_TRANSITIONS[selectedOrder.status?.toLowerCase()] && (
                          <button
                            className="xom3-btn xom3-btnPrimary"
                            disabled={updatingStatus}
                            onClick={() =>
                              updateOrderStatus(
                                selectedOrder.id,
                                STATUS_TRANSITIONS[selectedOrder.status.toLowerCase()].next
                              )
                            }
                            style={{ fontSize: 13 }}
                          >
                            {updatingStatus
                              ? "Updating..."
                              : STATUS_TRANSITIONS[selectedOrder.status.toLowerCase()].label}
                          </button>
                        )}
                        <button
                          className="xom3-btn xom3-btnSecondary"
                          disabled={updatingStatus}
                          onClick={() => {
                            if (confirm("Are you sure you want to cancel this order?")) {
                              updateOrderStatus(selectedOrder.id, "cancelled");
                            }
                          }}
                          style={{
                            fontSize: 13,
                            color: "#f87171",
                            borderColor: "rgba(248, 113, 113, 0.3)",
                          }}
                        >
                          Cancel Order
                        </button>

                        {(selectedOrder.status?.toLowerCase() === "paid" ||
                          selectedOrder.status?.toLowerCase() === "processing") && (
                          <button
                            className="xom3-btn xom3-btnSecondary"
                            disabled={processingRefund}
                            onClick={() => {
                              if (confirm("Process a full refund via Stripe? This will refund the customer and restore inventory.")) {
                                processRefund(selectedOrder.id);
                              }
                            }}
                            style={{
                              fontSize: 13,
                              color: "#fb923c",
                              borderColor: "rgba(251, 146, 60, 0.3)",
                            }}
                          >
                            {processingRefund ? "Processing..." : "Refund Order"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                {/* Fulfillment Engine Section */}
                {(selectedOrder.status?.toLowerCase() === "paid" ||
                  selectedOrder.status?.toLowerCase() === "processing") && (
                  <div
                    style={{
                      marginTop: 20,
                      padding: "16px 0 0 0",
                      borderTop: "1px solid rgba(139,92,246,0.15)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 16 }}>⚡</span>
                      <span
                        className="xom3-mono"
                        style={{ fontSize: 11, color: "#8b5cf6", letterSpacing: "0.08em", fontWeight: 700 }}
                      >
                        AI FULFILLMENT ENGINE
                      </span>
                    </div>

                    {!fulfillResult && !fulfillLoading && !fulfillError && (
                      <button
                        onClick={() => runFulfillment(selectedOrder)}
                        disabled={fulfillLoading}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                          border: "none",
                          borderRadius: 8,
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        ⚡ Generate Fulfillment Plan
                      </button>
                    )}

                    {fulfillLoading && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 20, gap: 10 }}>
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            border: "2px solid rgba(139,92,246,0.3)",
                            borderTopColor: "#8b5cf6",
                            borderRadius: "50%",
                            animation: "spin 0.8s linear infinite",
                          }}
                        />
                        <span style={{ color: "#8b5cf6", fontSize: 13, fontWeight: 600 }}>
                          AI is routing your order...
                        </span>
                      </div>
                    )}

                    {fulfillError && (
                      <div style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 8, padding: 12, marginBottom: 10 }}>
                        <div style={{ color: "#f87171", fontSize: 12 }}>{fulfillError}</div>
                        <button
                          onClick={() => runFulfillment(selectedOrder)}
                          style={{ marginTop: 8, padding: "6px 14px", background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 6, color: "#f87171", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {fulfillResult && (
                      <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                          <span style={{ color: "#4ade80" }}>✓</span>
                          <span style={{ fontWeight: 700, fontSize: 13, color: "#4ade80" }}>Fulfillment Plan Generated</span>
                        </div>

                        <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6 }}>
                          {fulfillResult.supplier && (
                            <div style={{ marginBottom: 6 }}>
                              <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Supplier:</span>{" "}
                              {fulfillResult.supplier?.name || fulfillResult.supplier?.type || "Auto-routed"}
                            </div>
                          )}
                          {fulfillResult.shipping && (
                            <div style={{ marginBottom: 6 }}>
                              <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Shipping:</span>{" "}
                              {fulfillResult.shipping?.method || fulfillResult.shipping?.carrier || "Standard"}
                            </div>
                          )}
                          {fulfillResult.estimatedDelivery && (
                            <div style={{ marginBottom: 6 }}>
                              <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Est. Delivery:</span>{" "}
                              {fulfillResult.estimatedDelivery}
                            </div>
                          )}
                          {fulfillResult.tracking && (
                            <div style={{ marginBottom: 6 }}>
                              <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Tracking:</span>{" "}
                              {fulfillResult.tracking?.number || "Pending"}
                            </div>
                          )}
                        </div>

                        <details style={{ marginTop: 8 }}>
                          <summary style={{ cursor: "pointer", fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                            View Raw Output
                          </summary>
                          <pre style={{ marginTop: 6, padding: 10, background: "rgba(0,0,0,0.3)", borderRadius: 6, fontSize: 10, color: "#94a3b8", overflow: "auto", maxHeight: 150, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                            {JSON.stringify(fulfillResult, null, 2)}
                          </pre>
                        </details>

                        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                          <button
                            onClick={() => sendNotification(selectedOrder)}
                            style={{
                              flex: 1,
                              padding: "10px 14px",
                              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                              border: "none",
                              borderRadius: 8,
                              color: "#fff",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            📧 Notify Customer
                          </button>
                          <button
                            onClick={() => {
                              updateOrderStatus(selectedOrder.id, "processing");
                            }}
                            disabled={updatingStatus || selectedOrder.status === "processing"}
                            style={{
                              flex: 1,
                              padding: "10px 14px",
                              background: selectedOrder.status === "processing" ? "rgba(34,197,94,0.1)" : "linear-gradient(135deg, #22c55e, #16a34a)",
                              border: selectedOrder.status === "processing" ? "1px solid rgba(34,197,94,0.2)" : "none",
                              borderRadius: 8,
                              color: "#fff",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: selectedOrder.status === "processing" ? "default" : "pointer",
                            }}
                          >
                            {selectedOrder.status === "processing" ? "✓ Processing" : "Start Processing"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                  <button
                    className="xom3-btn xom3-btnSecondary"
                    onClick={() => setSelectedOrder(null)}
                    style={{ flex: 1 }}
                  >
                    Close
                  </button>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            </div>
          )}
        </div>
      </main>
    </FeatureGate>
  );
}

const thStyle: React.CSSProperties = {
  padding: "12px 16px",
  textAlign: "left",
  fontWeight: 600,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--text-2)",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 16px",
  verticalAlign: "middle",
};

const actionBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: 16,
  padding: 4,
  opacity: 0.7,
  transition: "opacity 0.15s",
};

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "info" | "success" | "warning" | "neutral";
}) {
  const accentColors: Record<string, string> = {
    info: "#60a5fa",
    success: "#4ade80",
    warning: "#fbbf24",
    neutral: "var(--text-2)",
  };

  return (
    <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
      <div
        className="xom3-mono"
        style={{
          fontSize: 11,
          color: "var(--text-2)",
          letterSpacing: "0.08em",
          marginBottom: 6,
        }}
      >
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: accent ? accentColors[accent] : "var(--text-1)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

