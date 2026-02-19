'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/client';
import DashboardShell from '../components/DashboardShell';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  sales: number;
  status: 'active' | 'draft' | 'sold_out' | 'archived';
  created_at: string;
}

interface ProductForm {
  name: string;
  description: string;
  price: string;
  category: string;
  status: 'active' | 'draft';
  image_url: string;
}

const CATEGORIES = ['Digital', 'Templates', 'Courses', 'Services', 'Other'];

export default function SpaceBaddieStorePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<string>('all');
  
  const [form, setForm] = useState<ProductForm>({
    name: '',
    description: '',
    price: '',
    category: 'Digital',
    status: 'draft',
    image_url: '',
  });
  const [uploading, setUploading] = useState(false);

  const stats = {
    totalProducts: products.length,
    totalSales: products.reduce((sum, p) => sum + p.sales, 0),
    revenue: products.reduce((sum, p) => sum + (p.sales * p.price), 0),
    activeListings: products.filter(p => p.status === 'active').length,
  };

  useEffect(() => {
    checkAuthAndLoadProducts();
  }, []);

  const checkAuthAndLoadProducts = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.push('/spacebaddie/login');
        return;
      }
      await loadProducts();
    } catch (error) {
      console.error('Failed to check auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/spacebaddie/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const productData = {
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        category: form.category,
        status: form.status,
        image_url: form.image_url || null,
      };

      const url = editingProduct 
        ? `/api/spacebaddie/products/${editingProduct.id}`
        : '/api/spacebaddie/products';
      
      const response = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        throw new Error('Failed to save product');
      }

      setMessage({ type: 'success', text: editingProduct ? 'Product updated!' : 'Product created!' });
      setShowModal(false);
      setEditingProduct(null);
      resetForm();
      await loadProducts();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save product. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`/api/spacebaddie/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete product');
      }

      setMessage({ type: 'success', text: 'Product deleted!' });
      await loadProducts();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete product.' });
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category,
      status: product.status === 'active' ? 'active' : 'draft',
      image_url: product.image_url || '',
    });
    setShowModal(true);
  };

  const openNewModal = () => {
    setEditingProduct(null);
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      price: '',
      category: 'Digital',
      status: 'draft',
      image_url: '',
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setMessage({ type: 'error', text: 'Please upload an image or video file' });
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 50MB' });
      return;
    }

    setUploading(true);
    setMessage(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/commerce/products/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.url) {
        setForm({ ...form, image_url: data.url });
        setMessage({ type: 'success', text: 'Image uploaded successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Upload failed. Please try again.' });
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setMessage({ type: 'error', text: 'Upload failed. Please try again or paste a URL.' });
    } finally {
      setUploading(false);
    }
  };

  const filteredProducts = filter === 'all' 
    ? products 
    : products.filter(p => p.status === filter);

  if (loading) {
    return (
      <DashboardShell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '2px solid rgba(255,107,157,0.3)',
            borderTopColor: '#FF6B9D',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', color: '#fff' }}>
            Creator Store
          </h1>
          <p style={{ color: '#888', fontSize: '16px' }}>Sell digital products, templates, and courses to your audience</p>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: '8px',
            background: message.type === 'success' ? 'rgba(0,200,0,0.2)' : 'rgba(255,0,0,0.2)',
            color: message.type === 'success' ? '#0f0' : '#f00',
            fontSize: '14px',
          }}>
            {message.text}
          </div>
        )}

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📦</div>
            <p style={{ fontSize: '36px', fontWeight: 700, color: '#FF6B9D', marginBottom: '4px' }}>
              {stats.totalProducts}
            </p>
            <p style={{ color: '#888', fontSize: '14px' }}>Products</p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🛒</div>
            <p style={{ fontSize: '36px', fontWeight: 700, color: '#FF6B9D', marginBottom: '4px' }}>
              {stats.totalSales}
            </p>
            <p style={{ color: '#888', fontSize: '14px' }}>Total Sales</p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>💰</div>
            <p style={{ fontSize: '36px', fontWeight: 700, color: '#00D4D4', marginBottom: '4px' }}>
              ${stats.revenue.toLocaleString()}
            </p>
            <p style={{ color: '#888', fontSize: '14px' }}>Revenue</p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>✅</div>
            <p style={{ fontSize: '36px', fontWeight: 700, color: '#00D4D4', marginBottom: '4px' }}>
              {stats.activeListings}
            </p>
            <p style={{ color: '#888', fontSize: '14px' }}>Active Listings</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#fff' }}>Quick Actions</h2>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button 
              onClick={openNewModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 24px',
                background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '20px' }}>➕</span>
              Add New Product
            </button>
            <a
              href="https://shop.spacebaddie.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 24px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                fontWeight: 600,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '20px' }}>🛍️</span>
              View Public Store
            </a>
            <a
              href="/spacebaddie/insights"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 24px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#888',
                fontWeight: 500,
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '20px' }}>📊</span>
              Store Analytics
            </a>
          </div>
        </div>

        {/* Products List */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#fff' }}>Your Products</h2>
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#fff',
              }}
            >
              <option value="all">All Products</option>
              <option value="active">Active</option>
              <option value="draft">Drafts</option>
              <option value="sold_out">Sold Out</option>
            </select>
          </div>

          {filteredProducts.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '48px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>No products yet</h3>
              <p style={{ color: '#888', marginBottom: '24px' }}>Create your first product to start selling</p>
              <button
                onClick={openNewModal}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Add Product
              </button>
            </div>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              overflow: 'hidden',
            }}>
              {filteredProducts.map((product, index) => (
                <div key={product.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px',
                  borderBottom: index < filteredProducts.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(255,0,110,0.3) 0%, rgba(138,43,226,0.3) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                    }}>
                      {product.category === 'Digital' ? '📀' : 
                       product.category === 'Templates' ? '📄' :
                       product.category === 'Courses' ? '📚' :
                       product.category === 'Services' ? '🔧' : '📦'}
                    </div>
                    <div>
                      <h3 style={{ fontWeight: 600, marginBottom: '4px', color: '#fff' }}>{product.name}</h3>
                      <p style={{ color: '#888', fontSize: '14px' }}>{product.category}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 600, color: '#fff' }}>${product.price.toFixed(2)}</p>
                      <p style={{ color: '#888', fontSize: '14px' }}>{product.sales} sales</p>
                    </div>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: product.status === 'active' ? 'rgba(0,200,0,0.2)' : 
                                 product.status === 'draft' ? 'rgba(255,200,0,0.2)' : 'rgba(255,0,0,0.2)',
                      color: product.status === 'active' ? '#0f0' : 
                             product.status === 'draft' ? '#ff0' : '#f00',
                    }}>
                      {product.status}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => openEditModal(product)}
                        style={{
                          padding: '8px 16px',
                          background: 'rgba(255,255,255,0.1)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        style={{
                          padding: '8px 16px',
                          background: 'rgba(255,0,0,0.2)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#ff6b6b',
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coming Soon Features */}
        <div style={{
          marginTop: '32px',
          background: 'linear-gradient(135deg, rgba(255,0,110,0.1) 0%, rgba(138,43,226,0.1) 100%)',
          border: '1px solid rgba(255,0,110,0.3)',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
        }}>
          <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px', color: '#fff' }}>
            More Features Coming Soon
          </h3>
          <p style={{ color: '#888', marginBottom: '24px', maxWidth: '600px', margin: '0 auto 24px' }}>
            Courses, memberships, affiliate program, and direct checkout integration with Stripe.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888' }}>
              <span>📚</span> Courses
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888' }}>
              <span>🔒</span> Memberships
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888' }}>
              <span>🤝</span> Affiliates
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888' }}>
              <span>💳</span> Stripe
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#1a1a2e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px', color: '#fff' }}>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#888', fontSize: '14px' }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#888', fontSize: '14px' }}>
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Image/Video Upload */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#888', fontSize: '14px' }}>
                  Product Image/Video
                </label>
                <div style={{
                  border: '2px dashed rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  position: 'relative',
                }}>
                  {form.image_url ? (
                    <div style={{ position: 'relative' }}>
                      {form.image_url.includes('video') || form.image_url.endsWith('.mp4') || form.image_url.endsWith('.webm') ? (
                        <video
                          src={form.image_url}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '200px',
                            borderRadius: '8px',
                          }}
                          controls
                        />
                      ) : (
                        <img
                          src={form.image_url}
                          alt="Product preview"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '200px',
                            borderRadius: '8px',
                            objectFit: 'contain',
                          }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, image_url: '' })}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#ff4444',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                      />
                      <div style={{ marginBottom: '8px', fontSize: '32px' }}>
                        {uploading ? '⏳' : '📷'}
                      </div>
                      <p style={{ color: '#888', fontSize: '14px', marginBottom: '4px' }}>
                        {uploading ? 'Uploading...' : 'Click to upload image or video'}
                      </p>
                      <p style={{ color: '#666', fontSize: '12px' }}>
                        PNG, JPG, GIF, MP4 up to 50MB
                      </p>
                    </label>
                  )}
                </div>
                {/* URL input fallback */}
                <div style={{ marginTop: '12px' }}>
                  <input
                    type="url"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="Or paste image/video URL"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#888', fontSize: '14px' }}>
                    Price *
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#888', fontSize: '14px' }}>
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                    }}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#888', fontSize: '14px' }}>
                  Status
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    background: form.status === 'draft' ? 'rgba(255,200,0,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${form.status === 'draft' ? 'rgba(255,200,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#fff',
                  }}>
                    <input
                      type="radio"
                      name="status"
                      value="draft"
                      checked={form.status === 'draft'}
                      onChange={(e) => setForm({ ...form, status: 'draft' })}
                      style={{ display: 'none' }}
                    />
                    Draft
                  </label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    background: form.status === 'active' ? 'rgba(0,200,0,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${form.status === 'active' ? 'rgba(0,200,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#fff',
                  }}>
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={form.status === 'active'}
                      onChange={(e) => setForm({ ...form, status: 'active' })}
                      style={{ display: 'none' }}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                    resetForm();
                  }}
                  style={{
                    padding: '12px 24px',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
