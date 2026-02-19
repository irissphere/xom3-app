import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ShippingPolicyPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #070b14, #050810)",
        padding: "80px 32px",
        color: "#ffffff",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "48px", fontWeight: 700, marginBottom: "24px" }}>
        Shipping Policy
      </h1>
      <div style={{ fontSize: "16px", lineHeight: "1.8", color: "#94a3b8" }}>
        <p style={{ marginBottom: "24px" }}>Last updated: February 2026</p>

        <section style={{ marginBottom: "40px" }}>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "#ffffff",
              marginBottom: "16px",
            }}
          >
            Processing Time
          </h2>
          <p>
            Orders are typically processed within 1–3 business days after
            payment is confirmed. You will receive an order confirmation by
            email. When your order ships, we will send a shipping confirmation
            with tracking information when available.
          </p>
        </section>

        <section style={{ marginBottom: "40px" }}>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "#ffffff",
              marginBottom: "16px",
            }}
          >
            Delivery Times
          </h2>
          <p>
            Delivery times depend on your location and the product. Many
            physical orders ship via standard carriers (e.g., 5–15 business
            days domestically; longer for international). Some items may ship
            from partner warehouses, which can affect transit time. Estimated
            delivery windows are shown at checkout when available. Digital
            products are delivered by email or instant access after purchase.
          </p>
        </section>

        <section style={{ marginBottom: "40px" }}>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "#ffffff",
              marginBottom: "16px",
            }}
          >
            Shipping Costs
          </h2>
          <p>
            Shipping costs are calculated at checkout based on destination,
            weight, and method. Free shipping offers, if any, will be clearly
            stated on the product or cart page. We do not collect customs or
            import duties; those are the responsibility of the recipient for
            international orders.
          </p>
        </section>

        <section style={{ marginBottom: "40px" }}>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "#ffffff",
              marginBottom: "16px",
            }}
          >
            Track Your Order
          </h2>
          <p>
            You can track your order at{" "}
            <Link href="/track" style={{ color: "#a78bfa", textDecoration: "underline" }}>
              our Track Order page
            </Link>{" "}
            using your order ID and email. If your package is delayed or lost,
            contact us and we will help resolve it.
          </p>
        </section>

        <section>
          <h2
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "#ffffff",
              marginBottom: "16px",
            }}
          >
            Contact
          </h2>
          <p>
            For shipping questions, use{" "}
            <Link href="/track" style={{ color: "#a78bfa", textDecoration: "underline" }}>
              Track Order
            </Link>{" "}
            or contact support at support@xom3.io.
          </p>
        </section>
      </div>

      <p style={{ marginTop: "48px", fontSize: "14px", color: "#64748b" }}>
        <Link href="/shop" style={{ color: "#94a3b8", textDecoration: "none" }}>
          ← Back to Shop
        </Link>
      </p>
    </div>
  );
}
