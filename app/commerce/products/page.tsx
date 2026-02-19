"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { FeatureGate } from "@/app/components/FeatureGate";
import { PRODUCT_CATEGORIES } from "@/lib/commerce/categories";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  inventory_count?: number;
  category: string;
  image_url?: string;
  status?: string;
  product_type?: string;
}

interface NewProduct {
  name: string;
  description: string;
  price: string;
  stock: string;
  category: string;
  image_url: string;
  status: string;
  product_type: string;
}

interface AiProductResult {
  name: string;
  description: string;
  category: string;
  price: number;
}

interface AiProductIdea {
  name: string;
  description: string;
  category: string;
  price: number;
  sale_price?: number;
  estimated_margin?: number;
  trending_score?: number;
  trending_reason?: string;
  shelf_life?: string;
  shelf_life_detail?: string;
  selling_route?: string;
  selling_route_detail?: string;
  recommendation_tag?: string;
  competitive_edge?: string;
  image_url?: string | null;
  image_search_term?: string;
  tags?: string[];
}

interface CJProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  source: "cj_dropshipping";
  source_id: string;
  source_price: number;
  seller_name: string;
  variant_count?: number;
}

type PriceTier = "all" | "budget" | "mid" | "high_ticket";
type ProductsTab = "my_products" | "cj_dropshipping";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emptyForm: NewProduct = {
    name: "",
    description: "",
    price: "",
    stock: "",
    category: "",
    image_url: "",
    status: "active",
    product_type: "physical",
  };

  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState<NewProduct>(emptyForm);

  // AI-assist state
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<AiProductResult | null>(null);
  const [aiIdeas, setAiIdeas] = useState<AiProductIdea[]>([]);
  const [improvingDescription, setImprovingDescription] = useState(false);

  // Tab & CJ Dropshipping state
  const [activeTab, setActiveTab] = useState<ProductsTab>("my_products");
  const [cjQuery, setCjQuery] = useState("");
  const [cjProducts, setCjProducts] = useState<CJProduct[]>([]);
  const [cjLoading, setCjLoading] = useState(false);
  const [cjError, setCjError] = useState<string | null>(null);
  const [cjPriceTier, setCjPriceTier] = useState<PriceTier>("all");
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const cjSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-Post Modal state
  const [autoPostProduct, setAutoPostProduct] = useState<Product | null>(null);
  const [autoPostLoading, setAutoPostLoading] = useState(false);
  const [autoPostResult, setAutoPostResult] = useState<any>(null);
  const [autoPostError, setAutoPostError] = useState<string | null>(null);

  const handleAutoPost = async (product: Product) => {
    setAutoPostProduct(product);
    setAutoPostLoading(true);
    setAutoPostResult(null);
    setAutoPostError(null);
    try {
      const res = await fetch("/api/commerce/auto-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          platforms: ["tiktok", "instagram", "twitter"],
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAutoPostResult(data);
      } else {
        setAutoPostError(data.error || "Failed to generate posts");
      }
    } catch (err: any) {
      setAutoPostError(err.message || "Network error");
    } finally {
      setAutoPostLoading(false);
    }
  };

  // Engine Actions Modal state
  const [engineProduct, setEngineProduct] = useState<Product | null>(null);
  const [engineTab, setEngineTab] = useState<"funnel" | "store" | "ads">("funnel");
  const [engineLoading, setEngineLoading] = useState(false);
  const [engineResult, setEngineResult] = useState<any>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [engineSaving, setEngineSaving] = useState(false);

  const openEngineModal = (product: Product) => {
    setEngineProduct(product);
    setEngineTab("funnel");
    setEngineResult(null);
    setEngineError(null);
  };

  const closeEngineModal = () => {
    setEngineProduct(null);
    setEngineResult(null);
    setEngineError(null);
  };

  const runEngine = async (tab: string) => {
    if (!engineProduct) return;
    setEngineLoading(true);
    setEngineError(null);
    setEngineResult(null);

    try {
      let endpoint = "";
      let payload: any = {};

      if (tab === "funnel") {
        endpoint = "/api/commerce/funnels";
        payload = { action: "generate", productId: engineProduct.id };
      } else if (tab === "store") {
        endpoint = "/api/commerce/store-builder";
        payload = { action: "product-page", productId: engineProduct.id };
      } else if (tab === "ads") {
        endpoint = "/api/commerce/ads";
        payload = { action: "creatives", productId: engineProduct.id };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setEngineResult(data);
      } else {
        setEngineError(data.error || "Engine call failed");
      }
    } catch (err: any) {
      setEngineError(err.message || "Engine call failed");
    } finally {
      setEngineLoading(false);
    }
  };

  const saveEngineResult = async () => {
    if (!engineProduct || !engineResult) return;
    setEngineSaving(true);
    try {
      const metadataKey =
        engineTab === "funnel" ? "funnel" : engineTab === "store" ? "storePage" : "adCampaign";
      const res = await fetch(`/api/commerce/products/${engineProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: { [metadataKey]: engineResult },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setEngineError(null);
        alert(`${engineTab.charAt(0).toUpperCase() + engineTab.slice(1)} data saved to product!`);
      } else {
        setEngineError(data.error || "Failed to save");
      }
    } catch (err: any) {
      setEngineError(err.message || "Failed to save");
    } finally {
      setEngineSaving(false);
    }
  };

  const searchCJ = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setCjProducts([]);
      setCjError(null);
      return;
    }
    setCjLoading(true);
    setCjError(null);
    try {
      const res = await fetch(
        `/api/shop/search?query=${encodeURIComponent(query)}&source=cj_dropshipping&limit=20`
      );
      const data = await res.json();
      if (data.ok) {
        setCjProducts(data.products || []);
      } else {
        setCjError(data.error || "Search failed");
        setCjProducts([]);
      }
    } catch {
      setCjError("Failed to search CJ Dropshipping");
      setCjProducts([]);
    } finally {
      setCjLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "cj_dropshipping") return;
    if (cjSearchTimer.current) clearTimeout(cjSearchTimer.current);
    cjSearchTimer.current = setTimeout(() => searchCJ(cjQuery), 500);
    return () => {
      if (cjSearchTimer.current) clearTimeout(cjSearchTimer.current);
    };
  }, [cjQuery, activeTab, searchCJ]);

  function filterByPriceTier<T extends { price: number }>(items: T[], tier: PriceTier): T[] {
    let filtered = items;
    if (tier === "budget") filtered = items.filter((p) => p.price < 30);
    else if (tier === "mid") filtered = items.filter((p) => p.price >= 30 && p.price < 100);
    else if (tier === "high_ticket") filtered = items.filter((p) => p.price >= 100);
    if (tier === "high_ticket") return [...filtered].sort((a, b) => b.price - a.price);
    if (tier === "budget") return [...filtered].sort((a, b) => a.price - b.price);
    return filtered;
  }

  const filteredCjProducts = useMemo(
    () => filterByPriceTier(cjProducts, cjPriceTier),
    [cjProducts, cjPriceTier]
  );

  const handleCJImport = async (cjProduct: CJProduct) => {
    if (importingIds.has(cjProduct.source_id)) return;
    setImportingIds((prev) => new Set(prev).add(cjProduct.source_id));
    try {
      const res = await fetch("/api/commerce/cj-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          pid: cjProduct.source_id,
          markup: 2.5,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setImportedIds((prev) => new Set(prev).add(cjProduct.source_id));
        fetchProducts();
      } else {
        alert(data.error || "Import failed");
      }
    } catch {
      alert("Failed to import product");
    } finally {
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(cjProduct.source_id);
        return next;
      });
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setAiResult(null);
    setAiIdeas([]);
    setError(null);
    try {
      const res = await fetch("/api/commerce/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "product_ideas", prompt: aiPrompt }),
      });
      const data = await res.json();
      if (data.ok && data.ideas && data.ideas.length > 0) {
        setAiIdeas(data.ideas);
      } else {
        setError(data.error || "AI generation failed. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "AI generation failed");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSelectIdea = (idea: AiProductIdea) => {
    setForm({
      ...form,
      name: idea.name,
      description: idea.description,
      category: idea.category,
      price: String(idea.sale_price || idea.price),
      image_url: idea.image_url || "",
      stock: "",
      status: "active",
      product_type: "physical",
    });
    setShowAiGenerator(false);
    setAiIdeas([]);
    setAiPrompt("");
  };

  const handleAiUseResult = () => {
    if (!aiResult) return;
    setForm({
      ...form,
      name: aiResult.name,
      description: aiResult.description,
      category: aiResult.category,
      price: String(aiResult.price),
    });
    setShowAiGenerator(false);
    setAiResult(null);
    setAiPrompt("");
  };

  const handleImproveDescription = async () => {
    setImprovingDescription(true);
    try {
      const res = await fetch("/api/commerce/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "description",
          name: form.name,
          category: form.category,
          currentDescription: form.description,
        }),
      });
      const data = await res.json();
      if (data.ok && data.description) {
        setForm({ ...form, description: data.description });
      } else {
        setError(data.error || "Failed to improve description");
      }
    } catch (err: any) {
      setError(err.message || "Failed to improve description");
    } finally {
      setImprovingDescription(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/commerce/products");
      const data = await res.json();
      if (data.ok) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const stockVal = form.stock.trim();
    const payload = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price) || 0,
      inventory_count: stockVal === "" ? -1 : parseInt(stockVal) || 0,
      category: form.category,
      image_url: form.image_url || undefined,
      status: form.status || "active",
      product_type: form.product_type || "physical",
    };

    try {
      const url = editingId
        ? `/api/commerce/products/${editingId}`
        : "/api/commerce/products";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.ok) {
        setForm(emptyForm);
        setShowForm(false);
        setEditingId(null);
        fetchProducts();
      } else {
        setError(data.error || "Failed to save product");
      }
    } catch (err: any) {
      setError(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    const inv = product.inventory_count ?? product.stock;
    setForm({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      stock: inv < 0 ? "" : String(inv),
      category: product.category || "",
      image_url: product.image_url || "",
      status: product.status || "draft",
      product_type: product.product_type || "physical",
    });
    setEditingId(product.id);
    setShowForm(true);
    setError(null);
  };

  // Handle image file upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/commerce/products/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.ok && data.url) {
        setForm({ ...form, image_url: data.url });
      } else {
        setError(data.error || 'Failed to upload image');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this product?")) return;

    try {
      const res = await fetch(`/api/commerce/products/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.ok) {
        fetchProducts();
      } else {
        alert(data.error || "Failed to delete product");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete product");
    }
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
    setError(null);
  };

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
                COMMERCE / PRODUCTS
              </div>
              <h1
                style={{
                  margin: "10px 0 6px 0",
                  fontSize: 28,
                  fontWeight: 860,
                  letterSpacing: "-0.02em",
                }}
              >
                Product Catalog
              </h1>
              <p className="xom3-subtle" style={{ margin: 0, maxWidth: 720 }}>
                Manage your product inventory. Add, edit, and remove products.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link
                className="xom3-btn xom3-btnSecondary"
                href="/commerce"
              >
                {"\u2190"} Back
              </Link>
              <Link
                className="xom3-btn xom3-btnSecondary"
                href="/commerce/channels"
              >
                Sell elsewhere
              </Link>
              <Link
                href="/shop"
                target="_blank"
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
              {!showForm && (
                <button
                  className="xom3-btn xom3-btnPrimary"
                  onClick={() => {
                    setShowForm(true);
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                >
                  + Add Product
                </button>
              )}
            </div>
          </header>

          {/* Tab Switcher: My Products vs Browse CJ */}
          <div
            style={{
              display: "flex",
              gap: 4,
              marginTop: 18,
              background: "rgba(255,255,255,0.03)",
              borderRadius: 12,
              padding: 4,
              border: "1px solid rgba(255,255,255,0.06)",
              width: "fit-content",
            }}
          >
            {([
              { key: "my_products" as ProductsTab, label: "My Products", icon: "\u{1F4E6}" },
              { key: "cj_dropshipping" as ProductsTab, label: "Browse CJ Dropshipping", icon: "\u{1F50D}" },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "10px 20px",
                  background:
                    activeTab === tab.key
                      ? "linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(99,102,241,0.2) 100%)"
                      : "transparent",
                  border:
                    activeTab === tab.key
                      ? "1px solid rgba(139,92,246,0.3)"
                      : "1px solid transparent",
                  borderRadius: 8,
                  color: activeTab === tab.key ? "#c4b5fd" : "var(--text-2)",
                  fontSize: 13,
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>

          {/* CJ Dropshipping Browse Section */}
          {activeTab === "cj_dropshipping" && (
            <section className="xom3-section" style={{ marginTop: 18 }}>
              <div
                className="xom3-glass xom3-glassEdge"
                style={{ padding: 20 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{"\u{1F4E6}"}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#e2e8f0" }}>
                      Browse CJ Dropshipping
                    </div>
                    <div
                      className="xom3-subtle"
                      style={{ fontSize: 12, marginTop: 2 }}
                    >
                      Search trending products from CJ Dropshipping and import them to your store. No upfront cost {"\u{2014}"} you only pay when a customer orders.
                    </div>
                  </div>
                </div>

                {/* Search input */}
                <div style={{ position: "relative", marginBottom: 20 }}>
                  <input
                    className="xom3-input"
                    type="text"
                    value={cjQuery}
                    onChange={(e) => setCjQuery(e.target.value)}
                    placeholder="Search CJ trending products... (e.g. wireless earbuds, pet supplies, LED lights)"
                    style={{
                      width: "100%",
                      padding: "14px 18px 14px 44px",
                      fontSize: 14,
                      border: "2px solid rgba(139,92,246,0.2)",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        searchCJ(cjQuery);
                      }
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: 16,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 16,
                      opacity: 0.5,
                    }}
                  >
                    {"\u{1F50D}"}
                  </span>
                  {cjLoading && (
                    <span
                      style={{
                        position: "absolute",
                        right: 16,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: 12,
                        color: "#8b5cf6",
                        fontWeight: 600,
                      }}
                    >
                      Searching...
                    </span>
                  )}
                </div>

                {/* CJ Price tier filter pills */}
                {cjProducts.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    {(
                      [
                        { key: "all" as PriceTier, label: "All Prices" },
                        { key: "budget" as PriceTier, label: "Budget (Under $30)" },
                        { key: "mid" as PriceTier, label: `Mid-Range ($30\u{2014}$100)` },
                        { key: "high_ticket" as PriceTier, label: "High Ticket ($100+)" },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setCjPriceTier(t.key)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 20,
                          border:
                            cjPriceTier === t.key
                              ? "1px solid rgba(139,92,246,0.5)"
                              : "1px solid rgba(255,255,255,0.1)",
                          background:
                            cjPriceTier === t.key
                              ? "rgba(139,92,246,0.15)"
                              : "rgba(255,255,255,0.03)",
                          color: cjPriceTier === t.key ? "#c4b5fd" : "var(--text-2)",
                          fontSize: 12,
                          fontWeight: cjPriceTier === t.key ? 600 : 500,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                    <span style={{ fontSize: 12, color: "#64748b", marginLeft: 4 }}>
                      {filteredCjProducts.length} of {cjProducts.length}
                    </span>
                  </div>
                )}

                {/* CJ Loading */}
                {cjLoading && cjProducts.length === 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "60px 0",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        border: "3px solid rgba(139,92,246,0.3)",
                        borderTopColor: "#8b5cf6",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    <span style={{ color: "#8b5cf6", fontSize: 14, fontWeight: 500 }}>
                      Searching CJ Dropshipping...
                    </span>
                  </div>
                )}

                {/* CJ Config Error {"\u{2014}"} integration not set up */}
                {cjError &&
                  !cjLoading &&
                  (cjError.includes("not configured") || cjError.includes("CJ_API_KEY")) && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "48px 24px",
                        background: "rgba(139,92,246,0.06)",
                        border: "1px solid rgba(139,92,246,0.2)",
                        borderRadius: 12,
                      }}
                    >
                      <span style={{ fontSize: 40, display: "block", marginBottom: 12 }}>
                        {"\u26A0\uFE0F"}
                      </span>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          marginBottom: 8,
                          color: "#e2e8f0",
                        }}
                      >
                        CJ Dropshipping integration is not set up
                      </div>
                      <p
                        className="xom3-subtle"
                        style={{ fontSize: 13, maxWidth: 420, margin: "0 auto" }}
                      >
                        Add CJ_API_KEY in your project environment settings to search and
                        import products from the CJ Dropshipping catalog.
                      </p>
                    </div>
                  )}

                {/* CJ Error {"\u{2014}"} generic (e.g. network, API failure) */}
                {cjError &&
                  !cjLoading &&
                  !cjError.includes("not configured") &&
                  !cjError.includes("CJ_API_KEY") && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: 32,
                        background: "rgba(220,38,38,0.08)",
                        border: "1px solid rgba(220,38,38,0.2)",
                        borderRadius: 12,
                      }}
                    >
                      <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>
                        {cjError}
                      </p>
                    </div>
                  )}

                {/* CJ Empty Prompt */}
                {!cjLoading &&
                  !cjError &&
                  cjProducts.length === 0 &&
                  cjQuery.length < 2 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "48px 20px",
                        background: "rgba(139,92,246,0.04)",
                        border: "1px solid rgba(139,92,246,0.1)",
                        borderRadius: 12,
                      }}
                    >
                      <span style={{ fontSize: 48, display: "block", marginBottom: 16 }}>
                        {"\u{1F50D}"}
                      </span>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          marginBottom: 8,
                          color: "#e2e8f0",
                        }}
                      >
                        Search Trending Products
                      </div>
                      <p
                        className="xom3-subtle"
                        style={{
                          fontSize: 13,
                          maxWidth: 400,
                          margin: "0 auto",
                        }}
                      >
                        Type a product name above to search CJ Dropshipping&apos;s catalog. Find
                        winning products with zero upfront cost.
                      </p>
                    </div>
                  )}

                {/* CJ No Results */}
                {!cjLoading &&
                  !cjError &&
                  cjProducts.length === 0 &&
                  cjQuery.length >= 2 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "48px 20px",
                      }}
                    >
                      <span style={{ fontSize: 40, display: "block", marginBottom: 12 }}>
                        {"\u{1F615}"}
                      </span>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
                        No results found
                      </div>
                      <p className="xom3-subtle" style={{ fontSize: 13 }}>
                        Try a different search term
                      </p>
                    </div>
                  )}

                {/* CJ Products Grid */}
                {!cjLoading && cjProducts.length > 0 && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 16,
                      }}
                    >
                      <span
                        style={{
                          padding: "4px 10px",
                          background: "rgba(139,92,246,0.12)",
                          border: "1px solid rgba(139,92,246,0.2)",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#c4b5fd",
                          letterSpacing: "0.04em",
                        }}
                      >
                        CJ DROPSHIPPING
                      </span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {filteredCjProducts.length} product
                        {filteredCjProducts.length !== 1 ? "s" : ""} found
                      </span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                        gap: 16,
                      }}
                    >
                      {filteredCjProducts.map((cjp) => (
                        <div
                          key={cjp.id}
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(139,92,246,0.12)",
                            borderRadius: 14,
                            overflow: "hidden",
                            transition: "all 0.2s",
                          }}
                        >
                          {/* Image */}
                          <div
                            style={{
                              height: 160,
                              background:
                                "linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(59,130,246,0.1) 100%)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                              position: "relative",
                            }}
                          >
                            {cjp.image_url ? (
                              <img
                                src={`/api/commerce/cj-image?url=${encodeURIComponent(cjp.image_url)}`}
                                alt={cjp.name}
                                data-direct-url={cjp.image_url}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                }}
                                onError={(e) => {
                                  const el = e.target as HTMLImageElement;
                                  const direct = el.getAttribute("data-direct-url");
                                  if (direct && el.src !== direct) {
                                    el.src = direct;
                                    return;
                                  }
                                  el.style.display = "none";
                                }}
                              />
                            ) : null}
                            {!cjp.image_url ? (
                              <span style={{ fontSize: 48, opacity: 0.3 }}>{"\u{1F4E6}"}</span>
                            ) : null}
                            {/* Category badge */}
                            <span
                              style={{
                                position: "absolute",
                                top: 8,
                                left: 8,
                                padding: "3px 8px",
                                background: "rgba(0,0,0,0.6)",
                                backdropFilter: "blur(6px)",
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 600,
                                color: "#c4b5fd",
                              }}
                            >
                              {cjp.category}
                            </span>
                          </div>

                          {/* Info */}
                          <div style={{ padding: 14 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 13,
                                color: "#e2e8f0",
                                marginBottom: 8,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical" as const,
                                overflow: "hidden",
                                lineHeight: 1.4,
                              }}
                            >
                              {cjp.name}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 6,
                              }}
                            >
                              <span
                                className="xom3-mono"
                                style={{
                                  fontWeight: 800,
                                  fontSize: 18,
                                  color: "#4ade80",
                                }}
                              >
                                ${cjp.price.toFixed(2)}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "#475569",
                                  textDecoration: "line-through",
                                }}
                              >
                                Cost: ${cjp.source_price.toFixed(2)}
                              </span>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 10,
                                fontSize: 11,
                                color: "#64748b",
                              }}
                            >
                              <span
                                style={{
                                  padding: "2px 6px",
                                  background: "rgba(34,197,94,0.1)",
                                  border: "1px solid rgba(34,197,94,0.2)",
                                  borderRadius: 4,
                                  color: "#4ade80",
                                  fontWeight: 700,
                                  fontSize: 10,
                                }}
                              >
                                {cjp.price > 0
                                  ? `${Math.round(((cjp.price - cjp.source_price) / cjp.price) * 100)}% margin (at 2.5× markup)`
                                  : `\u2014 (at 2.5× markup)`}
                              </span>
                              {cjp.variant_count && cjp.variant_count > 0 && (
                                <span>
                                  {cjp.variant_count} variant
                                  {cjp.variant_count !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => handleCJImport(cjp)}
                              disabled={
                                importingIds.has(cjp.source_id) ||
                                importedIds.has(cjp.source_id)
                              }
                              style={{
                                width: "100%",
                                padding: "10px 14px",
                                background: importedIds.has(cjp.source_id)
                                  ? "rgba(34,197,94,0.12)"
                                  : importingIds.has(cjp.source_id)
                                  ? "rgba(139,92,246,0.12)"
                                  : "linear-gradient(135deg, #8b5cf6, #6366f1)",
                                border: importedIds.has(cjp.source_id)
                                  ? "1px solid rgba(34,197,94,0.25)"
                                  : importingIds.has(cjp.source_id)
                                  ? "1px solid rgba(139,92,246,0.25)"
                                  : "none",
                                borderRadius: 8,
                                color: importedIds.has(cjp.source_id)
                                  ? "#22c55e"
                                  : "#fff",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor:
                                  importingIds.has(cjp.source_id) ||
                                  importedIds.has(cjp.source_id)
                                    ? "default"
                                    : "pointer",
                                transition: "all 0.15s",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                              }}
                            >
                              {importedIds.has(cjp.source_id)
                                ? `\u{2713} Added to Shop`
                                : importingIds.has(cjp.source_id)
                                ? "Importing..."
                                : `\u{1F4E5} Import to Shop`}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* My Products Section */}
          {activeTab === "my_products" && (
            <>
          {/* Add/Edit Form */}
          {showForm && (
            <section className="xom3-section" style={{ marginTop: 18 }}>
              <div
                className="xom3-glass xom3-glassEdge"
                style={{ padding: 20 }}
              >
                <div className="xom3-panel-title">
                  {editingId ? "Edit Product" : "New Product"}
                </div>

                {error && (
                  <div
                    style={{
                      background: "rgba(220,38,38,0.15)",
                      border: "1px solid rgba(220,38,38,0.3)",
                      borderRadius: 8,
                      padding: "10px 14px",
                      marginTop: 12,
                      color: "#f87171",
                      fontSize: 13,
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* AI Product Generator */}
                <div
                  style={{
                    marginTop: 14,
                    borderRadius: 10,
                    border: "1px solid rgba(139,92,246,0.25)",
                    background: "linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(99,102,241,0.06) 100%)",
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowAiGenerator(!showAiGenerator)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "12px 16px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#c4b5fd",
                      fontSize: 14,
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>✨</span>
                    <span>Generate with AI</span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 11,
                        opacity: 0.6,
                        transition: "transform 0.2s",
                        transform: showAiGenerator ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    >
                      ▼
                    </span>
                  </button>

                  {showAiGenerator && (
                    <div style={{ padding: "0 16px 16px 16px" }}>
                      <p
                        className="xom3-subtle"
                        style={{ fontSize: 12, margin: "0 0 10px 0" }}
                      >
                        Describe your product idea and AI will generate the details for you.
                      </p>

                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          className="xom3-input"
                          type="text"
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="Describe your product idea..."
                          style={{ flex: 1 }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAiGenerate();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="xom3-btn xom3-btnPrimary"
                          onClick={handleAiGenerate}
                          disabled={aiGenerating || !aiPrompt.trim()}
                          style={{
                            background: aiGenerating
                              ? "rgba(139,92,246,0.3)"
                              : "linear-gradient(135deg, #8b5cf6, #6366f1)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {aiGenerating ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <span
                                style={{
                                  width: 14,
                                  height: 14,
                                  border: "2px solid rgba(255,255,255,0.3)",
                                  borderTopColor: "#fff",
                                  borderRadius: "50%",
                                  animation: "spin 0.8s linear infinite",
                                  display: "inline-block",
                                }}
                              />
                              Generating...
                            </span>
                          ) : (
                            "Generate"
                          )}
                        </button>
                      </div>

                      {/* AI Ideas Grid */}
                      {aiIdeas.length > 0 && (
                        <div style={{ marginTop: 14 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 12,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#c4b5fd", letterSpacing: "0.04em" }}>
                              <span>✨</span>
                              AI PRODUCT IDEAS {"\u{2014}"} {aiIdeas.length} OPTIONS RANKED
                            </div>
                            <button
                              type="button"
                              onClick={() => { setAiIdeas([]); }}
                              style={{ background: "transparent", border: "none", color: "#64748b", fontSize: 12, cursor: "pointer" }}
                            >
                              Clear
                            </button>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {aiIdeas.map((idea, idx) => {
                              const tagColors: Record<string, string> = {
                                "Best Overall": "#22c55e",
                                "Highest Margin": "#f59e0b",
                                "Most Trending": "#ef4444",
                                "Quick Win": "#3b82f6",
                                "Evergreen Pick": "#8b5cf6",
                              };
                              const tagColor = tagColors[idea.recommendation_tag || ""] || "#8b5cf6";
                              const routeLabels: Record<string, string> = {
                                "digital-download": "Digital Download",
                                "dropshipping": "Dropshipping",
                                "print-on-demand": "Print on Demand",
                                "subscription": "Subscription",
                                "service": "Service",
                                "course": "Online Course",
                              };

                              return (
                                <div
                                  key={idx}
                                  style={{
                                    padding: 16,
                                    borderRadius: 12,
                                    background: idx === 0 ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.02)",
                                    border: idx === 0
                                      ? "2px solid rgba(34,197,94,0.25)"
                                      : "1px solid rgba(255,255,255,0.08)",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                    position: "relative",
                                  }}
                                  onClick={() => handleSelectIdea(idea)}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = tagColor; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = idx === 0 ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)"; }}
                                >
                                  {/* Product Image */}
                                  {idea.image_url && (
                                    <div style={{
                                      width: "100%",
                                      height: 140,
                                      borderRadius: 8,
                                      overflow: "hidden",
                                      marginBottom: 10,
                                      background: "rgba(255,255,255,0.04)",
                                    }}>
                                      <img
                                        src={idea.image_url}
                                        alt={idea.name}
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                        }}
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                      />
                                    </div>
                                  )}

                                  {/* Recommendation Badge */}
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                                    {idx === 0 && (
                                      <span style={{
                                        padding: "2px 8px",
                                        background: `${tagColor}20`,
                                        border: `1px solid ${tagColor}40`,
                                        borderRadius: 4,
                                        fontSize: 10,
                                        fontWeight: 800,
                                        color: tagColor,
                                        letterSpacing: "0.05em",
                                      }}>
                                        â­ AI RECOMMENDED
                                      </span>
                                    )}
                                    <span style={{
                                      padding: "2px 8px",
                                      background: `${tagColor}15`,
                                      border: `1px solid ${tagColor}30`,
                                      borderRadius: 4,
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: tagColor,
                                    }}>
                                      {idea.recommendation_tag}
                                    </span>
                                  </div>

                                  {/* Product Name */}
                                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: "#fff" }}>
                                    {idea.name}
                                  </div>

                                  {/* Description */}
                                  <div style={{ fontSize: 12, lineHeight: 1.5, color: "#94a3b8", marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                                    {idea.description}
                                  </div>

                                  {/* Metrics Row */}
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                                    <div>
                                      <div className="xom3-subtle" style={{ fontSize: 10, marginBottom: 2 }}>PRICE</div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span className="xom3-mono" style={{ fontWeight: 800, fontSize: 16, color: "#4ade80" }}>
                                          ${(idea.sale_price || idea.price)?.toFixed?.(2) || idea.sale_price || idea.price}
                                        </span>
                                        {idea.sale_price && idea.price !== idea.sale_price && (
                                          <span style={{ fontSize: 12, color: "#475569", textDecoration: "line-through" }}>
                                            ${idea.price?.toFixed?.(2) || idea.price}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="xom3-subtle" style={{ fontSize: 10, marginBottom: 2 }}>MARGIN</div>
                                      <span className="xom3-mono" style={{ fontWeight: 700, fontSize: 14, color: (idea.estimated_margin || 0) >= 60 ? "#4ade80" : (idea.estimated_margin || 0) >= 40 ? "#fbbf24" : "#f87171" }}>
                                        {idea.estimated_margin}%
                                      </span>
                                    </div>
                                  </div>

                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                                    <div>
                                      <div className="xom3-subtle" style={{ fontSize: 10, marginBottom: 2 }}>TRENDING</div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <div style={{ width: 50, height: 5, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                                          <div style={{ width: `${(idea.trending_score || 0) * 10}%`, height: "100%", background: (idea.trending_score || 0) >= 7 ? "#ef4444" : (idea.trending_score || 0) >= 4 ? "#f59e0b" : "#64748b", borderRadius: 3 }} />
                                        </div>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: (idea.trending_score || 0) >= 7 ? "#ef4444" : "#94a3b8" }}>
                                          {idea.trending_score}/10
                                        </span>
                                      </div>
                                    </div>
                                    <div>
                                      <div className="xom3-subtle" style={{ fontSize: 10, marginBottom: 2 }}>SHELF LIFE</div>
                                      <span style={{ fontSize: 11, color: idea.shelf_life === "evergreen" ? "#4ade80" : "#f59e0b", fontWeight: 600, textTransform: "capitalize" as const }}>
                                        {idea.shelf_life}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Selling Route */}
                                  <div style={{ marginBottom: 8 }}>
                                    <div className="xom3-subtle" style={{ fontSize: 10, marginBottom: 3 }}>BEST SELLING ROUTE</div>
                                    <span style={{
                                      padding: "3px 8px",
                                      background: "rgba(59,130,246,0.12)",
                                      border: "1px solid rgba(59,130,246,0.2)",
                                      borderRadius: 4,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: "#60a5fa",
                                    }}>
                                      {routeLabels[idea.selling_route || ""] || idea.selling_route}
                                    </span>
                                  </div>

                                  {/* Competitive Edge */}
                                  {idea.competitive_edge && (
                                    <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic", marginBottom: 10 }}>
                                      &ldquo;{idea.competitive_edge}&rdquo;
                                    </div>
                                  )}

                                  {/* Select Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleSelectIdea(idea); }}
                                    style={{
                                      width: "100%",
                                      padding: "8px 14px",
                                      background: idx === 0
                                        ? "linear-gradient(135deg, #22c55e, #16a34a)"
                                        : "rgba(255,255,255,0.06)",
                                      border: idx === 0 ? "none" : "1px solid rgba(255,255,255,0.1)",
                                      borderRadius: 8,
                                      color: "#fff",
                                      fontSize: 12,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      letterSpacing: "0.02em",
                                    }}
                                  >
                                    {idx === 0 ? "\u26A1 Select Best Pick" : "Select This"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Legacy single AI Result (fallback) */}
                      {aiResult && aiIdeas.length === 0 && (
                        <div
                          style={{
                            marginTop: 14,
                            padding: 14,
                            borderRadius: 8,
                            background: "rgba(139,92,246,0.08)",
                            border: "1px solid rgba(139,92,246,0.18)",
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{aiResult.name}</div>
                          <div style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.9, marginBottom: 8 }}>{aiResult.description}</div>
                          <div className="xom3-mono" style={{ fontWeight: 700, fontSize: 16, color: "#4ade80", marginBottom: 10 }}>
                            ${aiResult.price.toFixed(2)}
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button type="button" className="xom3-btn xom3-btnPrimary" onClick={handleAiUseResult} style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}>
                              Use This
                            </button>
                            <button type="button" className="xom3-btn xom3-btnSecondary" onClick={() => setAiResult(null)}>
                              Try Again
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: 14,
                    }}
                  >
                    <div>
                      <label className="xom3-label">Name *</label>
                      <input
                        className="xom3-input"
                        type="text"
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                        required
                        placeholder="Product name"
                      />
                    </div>

                    <div>
                      <label className="xom3-label" htmlFor="product-category">
                        Category
                      </label>
                      <select
                        id="product-category"
                        className="xom3-input"
                        value={form.category || ""}
                        onChange={(e) =>
                          setForm({ ...form, category: e.target.value })
                        }
                        style={{ cursor: "pointer" }}
                        aria-label="Product category"
                      >
                        {PRODUCT_CATEGORIES.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                        {form.category &&
                          !(PRODUCT_CATEGORIES as readonly string[]).includes(form.category) && (
                          <option value={form.category}>{form.category}</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="xom3-label">Price *</label>
                      <input
                        className="xom3-input"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.price}
                        onChange={(e) =>
                          setForm({ ...form, price: e.target.value })
                        }
                        required
                        placeholder="29.99"
                      />
                    </div>

                    <div>
                      <label className="xom3-label">Stock <span style={{ opacity: 0.5, fontSize: 11 }}>(blank = unlimited)</span></label>
                      <input
                        className="xom3-input"
                        type="number"
                        min="0"
                        value={form.stock}
                        onChange={(e) =>
                          setForm({ ...form, stock: e.target.value })
                        }
                        placeholder="Leave blank for unlimited"
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <label className="xom3-label" style={{ margin: 0 }}>Description</label>
                      <button
                        type="button"
                        onClick={handleImproveDescription}
                        disabled={improvingDescription || !form.description.trim()}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "3px 10px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: improvingDescription ? "rgba(196,181,253,0.5)" : "#c4b5fd",
                          background: "rgba(139,92,246,0.12)",
                          border: "1px solid rgba(139,92,246,0.2)",
                          borderRadius: 6,
                          cursor: improvingDescription || !form.description.trim() ? "not-allowed" : "pointer",
                          opacity: improvingDescription || !form.description.trim() ? 0.5 : 1,
                          transition: "all 0.15s",
                          letterSpacing: "0.01em",
                        }}
                      >
                        {improvingDescription ? (
                          <>
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                border: "1.5px solid rgba(196,181,253,0.3)",
                                borderTopColor: "#c4b5fd",
                                borderRadius: "50%",
                                animation: "spin 0.8s linear infinite",
                                display: "inline-block",
                              }}
                            />
                            Improving...
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 12 }}>✨</span>
                            Improve with AI
                          </>
                        )}
                      </button>
                    </div>
                    <textarea
                      className="xom3-input"
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      rows={3}
                      placeholder="Product description..."
                      style={{ resize: "vertical" }}
                    />
                  </div>

                  {/* Image Upload Section */}
                  <div style={{ marginTop: 14 }}>
                    <label className="xom3-label">Product Image</label>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      {/* Preview */}
                      <div
                        style={{
                          width: 100,
                          height: 100,
                          borderRadius: 8,
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        {form.image_url ? (
                          <img
                            src={form.image_url}
                            alt="Preview"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <span style={{ fontSize: 32, opacity: 0.3 }}>{"\u{1F4F7}"}</span>
                        )}
                      </div>
                      
                      {/* Upload controls */}
                      <div style={{ flex: 1 }}>
                        <input
                          className="xom3-input"
                          type="text"
                          value={form.image_url}
                          onChange={(e) =>
                            setForm({ ...form, image_url: e.target.value })
                          }
                          placeholder="Image URL or upload below"
                          style={{ marginBottom: 8 }}
                        />
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <label
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "6px 12px",
                              background: "rgba(99,102,241,0.15)",
                              borderRadius: 6,
                              cursor: uploading ? "not-allowed" : "pointer",
                              fontSize: 13,
                              color: "#a5b4fc",
                              opacity: uploading ? 0.6 : 1,
                            }}
                          >
                            <span>{uploading ? "Uploading..." : "Upload Image"}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={uploading}
                              style={{ display: "none" }}
                            />
                          </label>
                          {form.image_url && (
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, image_url: "" })}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#f87171",
                                cursor: "pointer",
                                fontSize: 13,
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <p className="xom3-subtle" style={{ fontSize: 11, marginTop: 6 }}>
                          PNG, JPG or GIF. Max 5MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status Selector */}
                  <div style={{ marginTop: 14 }}>
                    <label className="xom3-label">Visibility</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { value: "active", label: "Active (Live in Shop)", color: "#4ade80" },
                        { value: "draft", label: "Draft (Hidden)", color: "#fbbf24" },
                        { value: "archived", label: "Archived", color: "#64748b" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setForm({ ...form, status: opt.value })}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            border: form.status === opt.value
                              ? `2px solid ${opt.color}`
                              : "1px solid rgba(255,255,255,0.1)",
                            background: form.status === opt.value
                              ? `${opt.color}15`
                              : "rgba(255,255,255,0.03)",
                            color: form.status === opt.value ? opt.color : "var(--text-2)",
                            transition: "all 0.15s",
                          }}
                        >
                          <span style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: opt.color,
                            marginRight: 8,
                            opacity: form.status === opt.value ? 1 : 0.4,
                          }} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {form.status === "draft" && (
                      <p className="xom3-subtle" style={{ fontSize: 11, marginTop: 6, color: "#fbbf24" }}>
                        Draft products will NOT appear in the public shop.
                      </p>
                    )}
                  </div>

                  {/* Product Type Selector */}
                  <div style={{ marginTop: 14 }}>
                    <label className="xom3-label">Product Type</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { value: "physical", label: "Physical", icon: "\u{1F4E6}", color: "#38bdf8" },
                        { value: "digital", label: "Digital", icon: "\u{1F4BE}", color: "#a78bfa" },
                        { value: "pod", label: "Print-on-Demand", icon: "\u{1F3A8}", color: "#f472b6" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setForm({ ...form, product_type: opt.value })}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            border: form.product_type === opt.value
                              ? `2px solid ${opt.color}`
                              : "1px solid rgba(255,255,255,0.1)",
                            background: form.product_type === opt.value
                              ? `${opt.color}15`
                              : "rgba(255,255,255,0.03)",
                            color: form.product_type === opt.value ? opt.color : "var(--text-2)",
                            transition: "all 0.15s",
                          }}
                        >
                          <span style={{ marginRight: 6 }}>{opt.icon}</span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {form.product_type === "digital" && (
                      <p className="xom3-subtle" style={{ fontSize: 11, marginTop: 6, color: "#a78bfa" }}>
                        Digital products skip shipping at checkout. Customers receive a download link by email.
                      </p>
                    )}
                    {form.product_type === "pod" && (
                      <p className="xom3-subtle" style={{ fontSize: 11, marginTop: 6, color: "#f472b6" }}>
                        Print-on-Demand items are printed and shipped by our fulfillment partner when ordered.
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: 18,
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      type="button"
                      className="xom3-btn xom3-btnSecondary"
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="xom3-btn xom3-btnSecondary"
                      disabled={saving}
                      onClick={() => {
                        setForm({ ...form, status: "draft" });
                        setTimeout(() => {
                          const formEl = document.querySelector("form");
                          if (formEl) formEl.requestSubmit();
                        }, 0);
                      }}
                    >
                      Save as Draft
                    </button>
                    <button
                      type="submit"
                      className="xom3-btn xom3-btnPrimary"
                      disabled={saving}
                      onClick={() => setForm({ ...form, status: "active" })}
                      style={{
                        background: "linear-gradient(135deg, #22c55e, #16a34a)",
                      }}
                    >
                      {saving
                        ? "Saving..."
                        : editingId
                        ? "Update & Publish"
                        : "Publish to Shop"}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          )}

          {/* Product List */}
          <section className="xom3-section" style={{ marginTop: 18 }}>
            {loading ? (
              <div
                className="xom3-glass xom3-glassEdge"
                style={{ padding: 40, textAlign: "center" }}
              >
                <div className="xom3-subtle">Loading products...</div>
              </div>
            ) : products.length === 0 ? (
              <div
                className="xom3-glass xom3-glassEdge"
                style={{ padding: 40, textAlign: "center" }}
              >
                <div
                  style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}
                >
                  {"\u{1F4E6}"}
                </div>
                <div className="xom3-panel-title">No products yet</div>
                <p className="xom3-subtle" style={{ margin: "8px 0 0 0" }}>
                  Add your first product to get started.
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
                      <th style={thStyle}>ID</th>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>Category</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Price</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Stock</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <td style={tdStyle}>
                          <span className="xom3-mono" style={{ opacity: 0.5 }}>
                            #{product.id}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {product.image_url && (
                              <img
                                src={product.image_url}
                                alt=""
                                style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0, background: "rgba(255,255,255,0.05)" }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            )}
                            <div>
                              <div style={{ fontWeight: 600 }}>{product.name}</div>
                              {product.description && (
                                <div
                                  className="xom3-subtle"
                                  style={{
                                    fontSize: 12,
                                    marginTop: 2,
                                    maxWidth: 300,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {product.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          {product.category ? (
                            <span
                              style={{
                                background: "rgba(99,102,241,0.15)",
                                color: "#a5b4fc",
                                padding: "3px 8px",
                                borderRadius: 4,
                                fontSize: 12,
                              }}
                            >
                              {product.category}
                            </span>
                          ) : (
                            <span style={{ opacity: 0.3 }}>{"\u{2014}"}</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <span className="xom3-mono">
                            ${product.price.toFixed(2)}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          {(product.inventory_count ?? product.stock) < 0 ? (
                            <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 600 }}>{"\u221E"} Unlimited</span>
                          ) : (
                            <span
                              style={{
                                color:
                                  (product.inventory_count ?? product.stock) > 10
                                    ? "#4ade80"
                                    : (product.inventory_count ?? product.stock) > 0
                                    ? "#fbbf24"
                                    : "#f87171",
                              }}
                            >
                              {product.inventory_count ?? product.stock}
                            </span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>
                          <button
                            onClick={() => openEngineModal(product)}
                            style={{
                              ...actionBtnStyle,
                              background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.15))",
                              border: "1px solid rgba(139,92,246,0.25)",
                              borderRadius: 6,
                              padding: "4px 8px",
                              opacity: 1,
                            }}
                            title="AI Engines (Funnel, Store Page, Ads)"
                          >
                            {"\u{26A1}"}
                          </button>
                          <button
                            onClick={() => handleAutoPost(product)}
                            style={{
                              ...actionBtnStyle,
                              marginLeft: 6,
                              background: "linear-gradient(135deg, rgba(255,0,110,0.12), rgba(138,43,226,0.12))",
                              border: "1px solid rgba(255,0,110,0.2)",
                              borderRadius: 6,
                              padding: "4px 8px",
                              opacity: 1,
                            }}
                            title="Auto-Post to Social Media"
                          >
                            {"\u{1F4C3}"}
                          </button>
                          <button
                            onClick={() => handleEdit(product)}
                            style={{ ...actionBtnStyle, marginLeft: 6 }}
                            title="Edit"
                          >
                            {"\u{270F}\uFE0F"}
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            style={{ ...actionBtnStyle, marginLeft: 6 }}
                            title="Delete"
                          >
                            {"\u{1F5D1}\uFE0F"}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Quick Stats */}
          <section className="xom3-section" style={{ marginTop: 18 }}>
            <div className="xom3-grid xom3-grid3">
              <StatCard
                label="Total Products"
                value={String(products.length)}
                accent="info"
              />
              <StatCard
                label="Total Stock"
                value={String(
                  products.reduce((sum, p) => {
                    const inv = p.inventory_count ?? p.stock ?? 0;
                    return sum + (inv < 0 ? 0 : inv);
                  }, 0)
                )}
              />
              <StatCard
                label="Catalog Value"
                value={`$${products
                  .reduce((sum, p) => {
                    const inv = p.inventory_count ?? p.stock ?? 0;
                    const qty = inv < 0 ? 0 : inv;
                    return sum + (p.price || 0) * qty;
                  }, 0)
                  .toFixed(2)}`}
                accent="success"
              />
            </div>
          </section>
            </>
          )}
        </div>
        {/* Engine Actions Modal */}
        {engineProduct && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(6px)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) closeEngineModal(); }}
          >
            <div
              style={{
                background: "var(--bg-1, #0f172a)",
                border: "1px solid rgba(139,92,246,0.25)",
                borderRadius: 16,
                width: "100%",
                maxWidth: 700,
                maxHeight: "85vh",
                overflow: "auto",
                padding: 24,
              }}
            >
              {/* Modal header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8b5cf6", letterSpacing: "0.1em", marginBottom: 4 }}>
                    AI COMMERCE ENGINES
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0" }}>
                    {engineProduct.name}
                  </div>
                </div>
                <button
                  onClick={closeEngineModal}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#94a3b8", fontSize: 18, cursor: "pointer", padding: "4px 10px" }}
                >
                  {"\u{2715}"}
                </button>
              </div>

              {/* Engine tabs */}
              <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 4, border: "1px solid rgba(255,255,255,0.06)" }}>
                {([
                  { key: "funnel" as const, label: "Funnel Builder", icon: "\u{1F4C4}" },
                  { key: "store" as const, label: "Store Page", icon: "\u{1F3EA}" },
                  { key: "ads" as const, label: "Ad Engine", icon: "\u{1F4E2}" },
                ]).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => { setEngineTab(t.key); setEngineResult(null); setEngineError(null); }}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      background: engineTab === t.key ? "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.2))" : "transparent",
                      border: engineTab === t.key ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
                      borderRadius: 8,
                      color: engineTab === t.key ? "#c4b5fd" : "var(--text-2)",
                      fontSize: 12,
                      fontWeight: engineTab === t.key ? 700 : 500,
                      cursor: "pointer",
                      transition: "all 0.15s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <span>{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>

              {/* Tab description */}
              <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16, lineHeight: 1.5 }}>
                {engineTab === "funnel" && `Generate a complete sales funnel \u{2014} landing page, upsells, checkout optimization, and post-purchase flow \u{2014} powered by AI using your real product data.`}
                {engineTab === "store" && "Generate an AI-optimized product page with hero section, benefits, social proof, FAQ, and urgency modules."}
                {engineTab === "ads" && "Generate ad creatives, targeting, and budget recommendations for your product. Works best after generating a funnel first."}
              </div>

              {/* Generate button */}
              <button
                onClick={() => runEngine(engineTab)}
                disabled={engineLoading}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  background: engineLoading ? "rgba(139,92,246,0.2)" : "linear-gradient(135deg, #8b5cf6, #6366f1)",
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: engineLoading ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.15s",
                  marginBottom: 16,
                }}
              >
                {engineLoading ? (
                  <>
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                        display: "inline-block",
                      }}
                    />
                    Generating with AI...
                  </>
                ) : (
                  <>
                    {"\u26A1"} Generate {engineTab === "funnel" ? "Funnel" : engineTab === "store" ? "Store Page" : "Ad Creatives"}
                  </>
                )}
              </button>

              {/* Error */}
              {engineError && (
                <div style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ color: "#f87171", fontSize: 13, fontWeight: 600 }}>{engineError}</div>
                </div>
              )}

              {/* Results */}
              {engineResult && (
                <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ color: "#4ade80", fontSize: 16 }}>{"\u{2713}"}</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#4ade80" }}>Generated Successfully</span>
                  </div>

                  {/* Funnel results */}
                  {engineTab === "funnel" && engineResult.funnel && (
                    <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Funnel ID:</span>{" "}
                        <span className="xom3-mono" style={{ fontSize: 11, color: "#8b5cf6" }}>{engineResult.funnel.funnel_id || "generated"}</span>
                      </div>
                      {engineResult.funnel.landing_page && (
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Landing Page:</span>{" "}
                          {engineResult.funnel.landing_page.headline || "Generated"}
                        </div>
                      )}
                      {engineResult.funnel.upsells && (
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Upsells:</span>{" "}
                          {Array.isArray(engineResult.funnel.upsells) ? engineResult.funnel.upsells.length : 0} generated
                        </div>
                      )}
                      {engineResult.funnel.checkout && (
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Checkout:</span>{" "}
                          Optimized
                        </div>
                      )}
                      {engineResult.funnel.post_purchase && (
                        <div>
                          <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Post-Purchase Flow:</span>{" "}
                          Configured
                        </div>
                      )}
                    </div>
                  )}

                  {/* Store page results */}
                  {engineTab === "store" && engineResult.productPage && (
                    <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>
                      {engineResult.productPage.hero && (
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Hero Headline:</span>{" "}
                          {engineResult.productPage.hero.headline || "Generated"}
                        </div>
                      )}
                      {engineResult.productPage.benefits && (
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Benefits:</span>{" "}
                          {Array.isArray(engineResult.productPage.benefits) ? engineResult.productPage.benefits.length : 0} benefit modules
                        </div>
                      )}
                      {engineResult.productPage.social_proof && (
                        <div style={{ marginBottom: 8 }}>
                          <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Social Proof:</span>{" "}
                          Configured
                        </div>
                      )}
                      {engineResult.productPage.faq && (
                        <div>
                          <span style={{ fontWeight: 700, color: "#e2e8f0" }}>FAQ:</span>{" "}
                          {Array.isArray(engineResult.productPage.faq) ? engineResult.productPage.faq.length : 0} questions
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ad results */}
                  {engineTab === "ads" && engineResult.creatives && (
                    <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: "#e2e8f0" }}>Creatives:</span>{" "}
                        {Array.isArray(engineResult.creatives) ? engineResult.creatives.length : "Generated"}
                      </div>
                    </div>
                  )}

                  {/* Raw JSON preview toggle */}
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: "pointer", fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                      View Raw Output
                    </summary>
                    <pre
                      style={{
                        marginTop: 8,
                        padding: 12,
                        background: "rgba(0,0,0,0.3)",
                        borderRadius: 8,
                        fontSize: 11,
                        color: "#94a3b8",
                        overflow: "auto",
                        maxHeight: 200,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                      }}
                    >
                      {JSON.stringify(engineResult, null, 2)}
                    </pre>
                  </details>

                  {/* Save button */}
                  <button
                    onClick={saveEngineResult}
                    disabled={engineSaving}
                    style={{
                      marginTop: 14,
                      width: "100%",
                      padding: "12px 16px",
                      background: engineSaving ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg, #22c55e, #16a34a)",
                      border: "none",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: engineSaving ? "default" : "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {engineSaving ? "Saving..." : `\u{1F4BE} Save to Product`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Auto-Post Modal */}
        {autoPostProduct && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(6px)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => { setAutoPostProduct(null); setAutoPostResult(null); setAutoPostError(null); }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--bg-1)",
                border: "1px solid var(--border-1)",
                borderRadius: 16,
                width: "90%",
                maxWidth: 560,
                maxHeight: "80vh",
                overflow: "auto",
                padding: 28,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  {"\u{1F4C3}"} Auto-Post to Social Media
                </h3>
                <button
                  onClick={() => { setAutoPostProduct(null); setAutoPostResult(null); setAutoPostError(null); }}
                  style={{ background: "none", border: "none", color: "var(--text-2)", fontSize: 20, cursor: "pointer" }}
                >
                  {"\u{2715}"}
                </button>
              </div>

              <div style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, marginBottom: 16, border: "1px solid var(--border-1)" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{autoPostProduct.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>${autoPostProduct.price?.toFixed(2)} Â· {autoPostProduct.category}</div>
              </div>

              {autoPostLoading && (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{ width: 36, height: 36, border: "3px solid rgba(255,0,110,0.2)", borderTopColor: "#FF006E", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
                  <div style={{ fontSize: 13, color: "var(--text-2)" }}>Generating social posts with AI...</div>
                </div>
              )}

              {autoPostError && (
                <div style={{ padding: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "#f87171", fontSize: 13, marginBottom: 12 }}>
                  {autoPostError}
                </div>
              )}

              {autoPostResult && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 16 }}>{"\u2611"}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#4ade80" }}>
                      {autoPostResult.ai_enhanced ? "AI-enhanced posts generated!" : "Posts generated!"}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 16 }}>
                    Scheduled for: {new Date(autoPostResult.scheduled_for).toLocaleString()}
                  </div>

                  {autoPostResult.captions?.map((caption: any, i: number) => (
                    <div key={i} style={{
                      padding: 16,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--border-1)",
                      borderRadius: 10,
                      marginBottom: 10,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 14 }}>
                          {caption.platform === "tiktok" ? "\u{1F3B5}" : caption.platform === "instagram" ? "\u{1F4F7}" : "\u{1D54F}"}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", textTransform: "capitalize" }}>
                          {caption.platform}
                        </span>
                        <span style={{
                          marginLeft: "auto",
                          padding: "2px 8px",
                          background: "rgba(34,197,94,0.1)",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#22c55e",
                        }}>
                          QUEUED
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {caption.caption}
                      </div>
                      <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {caption.hashtags?.slice(0, 5).map((tag: string, j: number) => (
                          <span key={j} style={{
                            padding: "2px 6px",
                            background: "rgba(139,92,246,0.08)",
                            borderRadius: 4,
                            fontSize: 10,
                            color: "#c4b5fd",
                          }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}

                  {autoPostResult.scheduled_posts?.length > 0 && (
                    <div style={{ fontSize: 12, color: "var(--text-2)", textAlign: "center", marginTop: 8 }}>
                      {autoPostResult.scheduled_posts.length} post{autoPostResult.scheduled_posts.length > 1 ? "s" : ""} scheduled. They will be published automatically.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Keyframe for AI spinner animation */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
  accent?: "info" | "success" | "danger" | "neutral";
}) {
  const accentColors: Record<string, string> = {
    info: "#60a5fa",
    success: "#4ade80",
    danger: "#f87171",
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

