import Link from "next/link";

export const dynamic = "force-dynamic";

export default function RefundPolicyPage() {
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
        Refund Policy
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
            30-Day Return Window
          </h2>
          <p>
            We want you to love your purchase. You may return most physical
            items within 30 days of the delivery date. Items must be unused and
            in original packaging. Once we receive and inspect your return, we
            will process your refund within 5–10 business days. Refunds are
            issued to the original payment method; timing to your account
            depends on your bank or card issuer.
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
            How to Request a Return
          </h2>
          <p>
            Submit a return request at{" "}
            <Link href="/returns" style={{ color: "#a78bfa", textDecoration: "underline" }}>
              our Returns page
            </Link>{" "}
            with your order ID and email. We will review your request within
            1–2 business days and send you instructions for returning your
            items. For defective or wrong items, we cover return shipping; for
            other reasons (e.g., changed mind), return shipping may be at your
            expense unless we state otherwise.
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
            Digital Products
          </h2>
          <p>
            Digital products (downloads, access codes, etc.) are non-refundable
            once they have been delivered or downloaded. If you have technical
            issues or did not receive access, contact us and we will work to
            resolve it.
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
            Non-Returnable Items
          </h2>
          <p>
            Besides digital products after delivery, we may exclude certain
            items (e.g., perishables, personalized goods) from returns. Any such
            exclusions will be noted on the product page or at checkout.
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
            For questions about returns or refunds, use our{" "}
            <Link href="/returns" style={{ color: "#a78bfa", textDecoration: "underline" }}>
              Returns page
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
