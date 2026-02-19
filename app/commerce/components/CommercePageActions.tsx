"use client";

import Link from "next/link";

/**
 * Shared action bar for commerce sub-pages: Back, View Store, Add Product.
 * Matches the layout on /commerce/products (image 3).
 */
export function CommercePageActions() {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <Link className="xom3-btn xom3-btnSecondary" href="/commerce">
        {"\u2190"} Back
      </Link>
      <Link
        href="/shop"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 16px",
          background: "linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)",
          border: "none",
          borderRadius: 8,
          color: "#fff",
          textDecoration: "none",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {"\u{1F6D2}"} View Store
      </Link>
      <Link className="xom3-btn xom3-btnPrimary" href="/commerce/products">
        + Add Product
      </Link>
    </div>
  );
}
