"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CommercePageActions } from "../components/CommercePageActions";
import { FeatureGate } from "@/app/components/FeatureGate";

const CJ_TIKTOK_URL = "https://cjdropshipping.com/integrations/tiktok-shop";
const CJ_INVENTORY_SYNC_URL = "https://cjdropshipping.com/article-details/How-to-Set-Inventory-Sync-on-TikTok-Shop";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  supplier_source?: string;
}

interface Listing {
  product_id: string;
  channel: string;
  external_id: string | null;
  listed_at: string;
  sync_status: string;
}

interface ListingsByProduct {
  [productId: string]: { [channel: string]: Listing };
}

export default function ChannelsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [listings, setListings] = useState<ListingsByProduct>({});
  const [loading, setLoading] = useState(true);
  const [fbListingProductId, setFbListingProductId] = useState<string | null>(null);
  const [amazonListingProductId, setAmazonListingProductId] = useState<string | null>(null);
  const [fbConnected, setFbConnected] = useState<boolean | null>(null);
  const [amazonConnected, setAmazonConnected] = useState<boolean | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsRes, listingsRes, fbRes, amazonRes] = await Promise.all([
        fetch("/api/commerce/products"),
        fetch("/api/commerce/channels/listings"),
        fetch("/api/commerce/channels/facebook/status"),
        fetch("/api/commerce/channels/amazon/status"),
      ]);
      const productsData = await productsRes.json();
      const listingsData = await listingsRes.json();
      if (productsData.ok && productsData.products) setProducts(productsData.products);
      if (listingsData.listings) setListings(listingsData.listings);
      if (fbRes.ok) {
        const f = await fbRes.json();
        setFbConnected(f.connected === true);
      } else setFbConnected(false);
      if (amazonRes.ok) {
        const a = await amazonRes.json();
        setAmazonConnected(a.connected === true);
      } else setAmazonConnected(false);
    } catch {
      setProducts([]);
      setListings({});
      setFbConnected(false);
      setAmazonConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const isListed = (productId: string, channel: string) => {
    return listings[productId]?.[channel]?.listed_at;
  };

  const handleListToFacebook = async (productId: string) => {
    setFbListingProductId(productId);
    try {
      const res = await fetch("/api/commerce/channels/facebook/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.ok) {
        await loadData();
      } else {
        alert(data.error || "Failed to list to Facebook");
      }
    } catch {
      alert("Request failed. Try again.");
    } finally {
      setFbListingProductId(null);
    }
  };

  const handleListToAmazon = async (productId: string) => {
    setAmazonListingProductId(productId);
    try {
      const res = await fetch("/api/commerce/channels/amazon/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (data.ok) {
        await loadData();
      } else {
        alert(data.error || "Failed to list to Amazon");
      }
    } catch {
      alert("Request failed. Try again.");
    } finally {
      setAmazonListingProductId(null);
    }
  };

  const cjSourcedCount = products.filter((p) => p.supplier_source === "cj_dropshipping").length;

  return (
    <FeatureGate feature="ecommerce">
      <main className="xom3-home">
        <div className="xom3-container" style={{ paddingTop: 22, paddingBottom: 80 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
            <div>
              <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>
                COMMERCE / SELL ELSEWHERE
              </div>
              <h1 style={{ margin: "10px 0 6px", fontSize: 28, fontWeight: 860 }}>
                Sales Channels
              </h1>
              <p className="xom3-subtle" style={{ margin: 0, maxWidth: 640 }}>
                List your products to TikTok Shop, Facebook Marketplace, and Amazon from one place.
              </p>
            </div>
            <CommercePageActions />
          </header>

          {/* TikTok Shop via CJ */}
          <section className="xom3-section" style={{ marginTop: 24 }}>
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>🎵</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>TikTok Shop</h2>
                  <p className="xom3-subtle" style={{ margin: 0, fontSize: 13 }}>
                    List via CJ Dropshipping. You signed up for TikTok Shop through CJ — connect TikTok in CJ and add products there.
                  </p>
                </div>
              </div>
              {cjSourcedCount > 0 && (
                <p style={{ margin: "0 0 12px", fontSize: 13, color: "#94a3b8" }}>
                  You have <strong style={{ color: "#e2e8f0" }}>{cjSourcedCount}</strong> product{cjSourcedCount !== 1 ? "s" : ""} from CJ. Add them to TikTok Shop from your CJ dashboard.
                </p>
              )}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a
                  href={CJ_TIKTOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="xom3-btn xom3-btnPrimary"
                  style={{ textDecoration: "none" }}
                >
                  Open CJ TikTok integration
                </a>
                <a
                  href={CJ_INVENTORY_SYNC_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="xom3-btn xom3-btnSecondary"
                  style={{ textDecoration: "none" }}
                >
                  How to sync inventory
                </a>
              </div>
            </div>
          </section>

          {/* Facebook Marketplace */}
          <section className="xom3-section" style={{ marginTop: 20 }}>
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>👥</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Facebook Marketplace</h2>
                  <p className="xom3-subtle" style={{ margin: 0, fontSize: 13 }}>
                    List products to your Facebook catalog so they appear on Marketplace.
                  </p>
                </div>
              </div>
              {fbConnected ? (
                <>
                  <p style={{ margin: "0 0 12px", fontSize: 13, color: "#4ade80" }}>Connected. Select a product to list:</p>
                  {loading ? (
                    <p className="xom3-subtle">Loading products…</p>
                  ) : products.length === 0 ? (
                    <p className="xom3-subtle">Add products in Commerce first.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
                      {products.slice(0, 20).map((p) => (
                        <div
                          key={p.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 12px",
                            background: "rgba(255,255,255,0.03)",
                            borderRadius: 8,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {p.image_url && (
                              <img src={p.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover" }} />
                            )}
                            <div>
                              <div style={{ fontWeight: 600 }}>{p.name}</div>
                              <div className="xom3-subtle" style={{ fontSize: 12 }}>${p.price.toFixed(2)}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {isListed(p.id, "facebook") ? (
                              <span style={{ fontSize: 12, color: "#4ade80" }}>Listed</span>
                            ) : (
                              <button
                                className="xom3-btn xom3-btnPrimary"
                                style={{ fontSize: 12, padding: "6px 12px" }}
                                disabled={fbListingProductId === p.id}
                                onClick={() => handleListToFacebook(p.id)}
                              >
                                {fbListingProductId === p.id ? "Listing…" : "List to Facebook"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {products.length > 20 && (
                        <p className="xom3-subtle" style={{ fontSize: 12 }}>Showing first 20. List more from the Products page.</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
                  Connect your Meta catalog in environment variables (META_CATALOG_ID, META_ACCESS_TOKEN). See docs for setup.
                </p>
              )}
            </div>
          </section>

          {/* Amazon */}
          <section className="xom3-section" style={{ marginTop: 20 }}>
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>📦</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Amazon</h2>
                  <p className="xom3-subtle" style={{ margin: 0, fontSize: 13 }}>
                    List products to Amazon Seller Central via SP-API.
                  </p>
                </div>
              </div>
              {amazonConnected ? (
                <>
                  <p style={{ margin: "0 0 12px", fontSize: 13, color: "#4ade80" }}>Connected. Select a product to list:</p>
                  {loading ? (
                    <p className="xom3-subtle">Loading products…</p>
                  ) : products.length === 0 ? (
                    <p className="xom3-subtle">Add products in Commerce first.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
                      {products.slice(0, 20).map((p) => (
                        <div
                          key={p.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 12px",
                            background: "rgba(255,255,255,0.03)",
                            borderRadius: 8,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {p.image_url && (
                              <img src={p.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover" }} />
                            )}
                            <div>
                              <div style={{ fontWeight: 600 }}>{p.name}</div>
                              <div className="xom3-subtle" style={{ fontSize: 12 }}>${p.price.toFixed(2)}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {isListed(p.id, "amazon") ? (
                              <span style={{ fontSize: 12, color: "#4ade80" }}>Listed</span>
                            ) : (
                              <button
                                className="xom3-btn xom3-btnPrimary"
                                style={{ fontSize: 12, padding: "6px 12px" }}
                                disabled={amazonListingProductId === p.id}
                                onClick={() => handleListToAmazon(p.id)}
                              >
                                {amazonListingProductId === p.id ? "Listing…" : "List to Amazon"}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {products.length > 20 && (
                        <p className="xom3-subtle" style={{ fontSize: 12 }}>Showing first 20.</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
                  Connect Amazon Seller Central via SP-API credentials in environment variables. See docs for setup.
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
    </FeatureGate>
  );
}
